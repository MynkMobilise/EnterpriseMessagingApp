/**
 * End-to-end test that exercises the SAME flow the message worker uses:
 *   1. Read organization_settings row from DB
 *   2. Decrypt the access_token using the configured ENCRYPTION_KEY
 *   3. POST to Meta Graph API
 *
 * If the org row is missing a token (cleared earlier by failed decryption),
 * we re-encrypt the WHATSAPP_ACCESS_TOKEN from .env with the now-persistent
 * key and write it back, so the worker can use it going forward.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { Sequelize } = require('sequelize');
const { encrypt, decrypt, isEncrypted } = require('../src/utils/encryption');

const RECIPIENT = process.argv[2] || '+918558815223';
const TEMPLATE = process.argv[3] || 'hello_world';
const LANG = process.argv[4] || 'en_US';
const ORG_NAME_LIKE = 'Mobilise';

const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'mysql',
  logging: false,
});

(async () => {
  console.log('=== End-to-end DB-credential WhatsApp send test ===\n');

  // sanity: encryption key must be set
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
    console.error('ENCRYPTION_KEY is not set to 64 hex chars in .env. Aborting.');
    process.exit(1);
  }
  console.log('[0] ENCRYPTION_KEY is configured (len=' + process.env.ENCRYPTION_KEY.length + ')');

  // Step 1: find Mobilise org settings
  const [rows] = await seq.query(`
    SELECT os.id, os.organization_id, os.whatsapp_business_account_id AS waba_id,
           os.whatsapp_phone_number_id AS phone_id, os.whatsapp_api_version AS api_version,
           os.whatsapp_access_token AS token, o.name AS org_name
    FROM organization_settings os
    JOIN organizations o ON o.id = os.organization_id
    WHERE o.name LIKE :n
  `, { replacements: { n: `%${ORG_NAME_LIKE}%` } });

  if (rows.length === 0) {
    console.error(`No organization matching ~${ORG_NAME_LIKE}~ found.`);
    process.exit(1);
  }
  const row = rows[0];
  console.log(`[1] Org: ${row.org_name} (id=${row.organization_id})`);
  console.log(`    WABA=${row.waba_id} Phone=${row.phone_id} ApiVersion=${row.api_version}`);
  console.log(`    Token in DB: ${row.token ? 'SET (len=' + row.token.length + ')' : 'NULL/EMPTY'}`);

  // Step 2: ensure DB token decrypts; if not, re-encrypt from .env and store
  let plainToken = null;
  if (row.token && isEncrypted(row.token)) {
    try {
      plainToken = decrypt(row.token);
      console.log(`[2] Decrypted DB token OK (plain len=${plainToken.length}).`);
    } catch (e) {
      console.log(`[2] DB token cannot decrypt with current key (${e.message}). Will re-encrypt from .env.`);
    }
  } else if (row.token) {
    console.log('[2] DB token is in plain-text format. Using as-is.');
    plainToken = row.token;
  } else {
    console.log('[2] DB token is NULL/EMPTY. Will re-encrypt from .env.');
  }

  if (!plainToken) {
    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      console.error('WHATSAPP_ACCESS_TOKEN not in .env, cannot reseed.');
      process.exit(1);
    }
    plainToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const cipher = encrypt(plainToken);
    await seq.query(
      'UPDATE organization_settings SET whatsapp_access_token = :t, updated_at = NOW() WHERE id = :id',
      { replacements: { t: cipher, id: row.id } }
    );
    console.log(`    Wrote re-encrypted token to DB (cipher len=${cipher.length}).`);

    // verify round-trip
    const [check] = await seq.query('SELECT whatsapp_access_token AS t FROM organization_settings WHERE id = :id',
      { replacements: { id: row.id } });
    const verify = decrypt(check[0].t);
    if (verify !== plainToken) {
      console.error('Round-trip failed: decrypted token does not match original!');
      process.exit(1);
    }
    console.log('    Round-trip decrypt verified.');
  }

  // Step 3: send to Meta
  const url = `https://graph.facebook.com/${row.api_version || 'v18.0'}/${row.phone_id}/messages`;
  const to = RECIPIENT.replace(/^\+/, '');
  console.log(`\n[3] POSTing to ${url}`);
  console.log(`    Recipient: ${RECIPIENT}, template: ${TEMPLATE} (${LANG})`);

  try {
    const resp = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: { name: TEMPLATE, language: { code: LANG } },
      },
      { headers: { Authorization: `Bearer ${plainToken}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    console.log('\n[4] SEND OK ->', JSON.stringify(resp.data, null, 2));
    console.log('\n>>> Check WhatsApp on ' + RECIPIENT + ' — message should arrive shortly.');
  } catch (e) {
    console.error('\n[4] SEND FAIL ->', JSON.stringify(e.response?.data || { message: e.message }, null, 2));
    process.exit(2);
  }

  await seq.close();
})();
