/**
 * Meta Resumable Upload helper.
 *
 * Carousel + media-header templates require each image/video to be uploaded
 * to Meta first to obtain an opaque header_handle that's embedded in the
 * template submission payload. Local URLs (e.g. /uploads/media/<orgId>/foo.png)
 * are NOT accepted by Meta — Meta cannot reach our server.
 *
 * Flow per file:
 *   1. POST /<APP_ID>/uploads?file_name=&file_length=&file_type=&access_token=
 *      → returns { id: 'upload:<session-id>' }
 *   2. POST <session-id>?access_token=  with body = raw file bytes
 *      and header `file_offset: 0`
 *      → returns { h: '<opaque-handle>' }
 *
 * The handle is what we put in `example.header_handle: ['<h>']` in the
 * template's HEADER component. Meta uses it to fetch + cache the asset.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates#sample-request
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorTypes');

const META_API_VERSION = 'v18.0';
const UPLOAD_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Resolve a local media URL (`/uploads/media/<org>/<file>`) to an absolute
 * filesystem path so we can read the bytes.
 */
function localUrlToFsPath(localUrl) {
  // localUrl looks like '/uploads/media/<org>/<file>'. The static handler in
  // app.js maps `/uploads` → `<backend>/uploads`. So strip the leading slash
  // and join from the project root (backend/).
  const stripped = localUrl.replace(/^\/+/, '');
  // The script may be invoked from anywhere; resolve relative to backend/.
  const backendRoot = path.resolve(__dirname, '../../');
  return path.join(backendRoot, stripped);
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Upload a single local file to Meta and return the header_handle.
 *
 * @param {Object} args
 * @param {string} args.localUrl    e.g. '/uploads/media/abc/xyz.png'
 * @param {string} args.appId       Meta App ID (numeric string)
 * @param {string} args.accessToken Long-lived access token
 * @returns {Promise<string>} the header_handle ('h' value)
 */
async function uploadByLocalUrl({ localUrl, appId, accessToken }) {
  if (!localUrl) throw new AppError('uploadByLocalUrl: localUrl is required', 400);
  if (!appId) throw new AppError('Meta App ID is not configured for this organization. Required for carousel/media-header templates.', 400);
  if (!accessToken) throw new AppError('uploadByLocalUrl: accessToken is required', 400);

  const fsPath = localUrlToFsPath(localUrl);
  if (!fs.existsSync(fsPath)) {
    throw new AppError(`Media file not found on server: ${localUrl}`, 404);
  }
  const stat = fs.statSync(fsPath);
  const fileType = guessMimeType(fsPath);
  const fileName = path.basename(fsPath);

  // 1. Start upload session
  let sessionId;
  try {
    const startUrl = `${UPLOAD_BASE}/${appId}/uploads`;
    const startResp = await axios.post(startUrl, null, {
      params: {
        file_name: fileName,
        file_length: stat.size,
        file_type: fileType,
        access_token: accessToken,
      },
      timeout: 15000,
    });
    sessionId = startResp.data?.id;
    if (!sessionId) {
      throw new AppError('Meta upload session start: missing id in response', 502);
    }
  } catch (e) {
    const metaErr = e.response?.data?.error;
    logger.warn('Meta upload session start failed', {
      fileName, status: e.response?.status, error: metaErr || e.message,
    });
    throw new AppError(
      `Meta upload session failed: ${metaErr?.message || e.message}`,
      e.response?.status || 502,
    );
  }

  // 2. Upload bytes. Endpoint is `<sessionId>` (already includes `upload:` prefix).
  let handle;
  try {
    const uploadUrl = `${UPLOAD_BASE}/${sessionId}`;
    const fileStream = fs.readFileSync(fsPath);
    const uploadResp = await axios.post(uploadUrl, fileStream, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: '0',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    handle = uploadResp.data?.h;
    if (!handle) {
      throw new AppError('Meta upload: missing h (handle) in response', 502);
    }
  } catch (e) {
    const metaErr = e.response?.data?.error;
    logger.warn('Meta upload bytes failed', {
      fileName, status: e.response?.status, error: metaErr || e.message,
    });
    throw new AppError(
      `Meta upload bytes failed: ${metaErr?.message || e.message}`,
      e.response?.status || 502,
    );
  }

  logger.info?.('Meta upload OK', { fileName, handleLen: handle.length });
  return handle;
}

/**
 * Upload a local file to the WhatsApp message-media endpoint and return
 * the resulting `media_id`.
 *
 * This is a DIFFERENT upload from `uploadByLocalUrl` above:
 *   - `uploadByLocalUrl` uses Resumable Upload + APP_ID. The result is a
 *     `header_handle` used at TEMPLATE APPROVAL time only.
 *   - this one (`uploadMessageMedia`) uses the simpler `/<phone-number-id>/media`
 *     endpoint. The result is a `media_id` used when SENDING messages
 *     (including carousel template messages — each card's header parameter
 *     has to reference one of these).
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
 *
 * @param {Object} args
 * @param {string} args.localUrl       e.g. '/uploads/media/<orgId>/<file>'
 * @param {string} args.phoneNumberId  org's whatsappPhoneNumberId
 * @param {string} args.accessToken    decrypted access token
 * @param {string} [args.apiVersion]
 * @returns {Promise<string>} the media_id
 */
async function uploadMessageMedia({ localUrl, phoneNumberId, accessToken, apiVersion }) {
  if (!localUrl) throw new AppError('uploadMessageMedia: localUrl is required', 400);
  if (!phoneNumberId) throw new AppError('uploadMessageMedia: phoneNumberId is required', 400);
  if (!accessToken) throw new AppError('uploadMessageMedia: accessToken is required', 400);

  const fsPath = localUrlToFsPath(localUrl);
  if (!fs.existsSync(fsPath)) {
    throw new AppError(`Media file not found on server: ${localUrl}`, 404);
  }
  const mimeType = guessMimeType(fsPath);
  const fileName = path.basename(fsPath);
  const ver = apiVersion || META_API_VERSION;

  // multipart/form-data — use the built-in FormData (Node 18+) so we don't
  // pull in the form-data dep.
  const FormData = require('form-data');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', fs.createReadStream(fsPath), { filename: fileName, contentType: mimeType });

  const url = `https://graph.facebook.com/${ver}/${phoneNumberId}/media`;
  let resp;
  try {
    resp = await axios.post(url, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${accessToken}` },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
  } catch (e) {
    const metaErr = e.response?.data?.error;
    logger.warn('Meta message-media upload failed', {
      fileName, status: e.response?.status, error: metaErr || e.message,
    });
    throw new AppError(
      `Meta message-media upload failed: ${metaErr?.message || e.message}`,
      e.response?.status || 502,
    );
  }

  const mediaId = resp.data?.id;
  if (!mediaId) {
    throw new AppError('Meta message-media upload: no id in response', 502);
  }
  logger.info?.('Meta message-media OK', { fileName, mediaId });
  return mediaId;
}

module.exports = { uploadByLocalUrl, localUrlToFsPath, uploadMessageMedia };
