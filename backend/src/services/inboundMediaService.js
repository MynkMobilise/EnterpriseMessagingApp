/**
 * Download a media asset that a customer sent us via WhatsApp.
 *
 * Meta only puts the media_id in the inbound webhook payload — the actual
 * bytes have to be fetched in two hops:
 *
 *   1. GET /<API_VER>/<media_id>?access_token=...
 *      → { url, mime_type, sha256, file_size }
 *   2. GET <url> with Authorization: Bearer <token>
 *      → raw bytes
 *
 * Meta's media URLs expire after 5 minutes and the media_id itself expires
 * after ~5 days, so we save the bytes to disk and serve them through our
 * own /uploads/inbound/<orgId>/... static handler. The Live Chat UI then
 * never needs to talk to Meta to render images.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('../utils/logger');

const META_API_VERSION = process.env.META_API_VERSION || 'v18.0';

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function extFromMime(mime) {
  return MIME_TO_EXT[mime] || 'bin';
}

/**
 * Pull the media bytes from Meta and persist them locally.
 *
 * @param {Object} args
 * @param {string} args.mediaId       Meta's opaque media_id from the webhook
 * @param {number} args.organizationId
 * @param {string} args.wamid         The inbound message id (used as filename for traceability)
 * @param {string} args.accessToken   The org's WhatsApp access token (already decrypted)
 * @returns {Promise<{ url: string, mimeType: string, size: number } | null>}
 *   `null` if the download fails — caller should still persist the message
 *   row (with a `[image]` placeholder content) so the conversation isn't lost.
 */
async function downloadAndStore({ mediaId, organizationId, wamid, accessToken }) {
  if (!mediaId || !organizationId || !accessToken) {
    logger.warn('inboundMediaService.downloadAndStore: missing args', {
      hasMediaId: !!mediaId, hasOrg: !!organizationId, hasToken: !!accessToken,
    });
    return null;
  }

  // 1. Get download URL from Meta
  let metaResp;
  try {
    metaResp = await axios.get(
      `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 }
    );
  } catch (e) {
    logger.warn('inboundMediaService: meta media-info fetch failed', {
      mediaId, error: e.response?.data?.error?.message || e.message,
    });
    return null;
  }

  const { url, mime_type: mimeType, file_size: fileSize } = metaResp.data || {};
  if (!url) {
    logger.warn('inboundMediaService: no URL in meta media-info response', { mediaId });
    return null;
  }

  // 2. Stream the bytes to disk. Use Authorization header (NOT a query param)
  //    — Meta requires the same bearer token on the CDN URL.
  let buffer;
  try {
    const fileResp = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    buffer = Buffer.from(fileResp.data);
  } catch (e) {
    logger.warn('inboundMediaService: meta CDN fetch failed', {
      mediaId, error: e.response?.status || e.message,
    });
    return null;
  }

  // 3. Save under backend/uploads/inbound/<orgId>/<wamid>.<ext>
  const ext = extFromMime(mimeType);
  const dirAbs = path.join(process.cwd(), 'uploads', 'inbound', String(organizationId));
  fs.mkdirSync(dirAbs, { recursive: true });
  const filename = `${wamid || mediaId}.${ext}`;
  const fileAbs = path.join(dirAbs, filename);
  fs.writeFileSync(fileAbs, buffer);

  const localUrl = `/uploads/inbound/${organizationId}/${filename}`;
  logger.info?.('Inbound media stored', {
    organizationId, wamid, mediaId, mimeType, size: buffer.length, url: localUrl,
  });

  return { url: localUrl, mimeType, size: fileSize || buffer.length };
}

module.exports = { downloadAndStore };
