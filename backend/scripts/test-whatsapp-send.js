require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const RECIPIENT = process.argv[2];
const TEMPLATE = process.argv[3] || 'hello_world';
const LANG = process.argv[4] || 'en_US';

if (!RECIPIENT) {
  console.error('Usage: node test-whatsapp-send.js <+E164phone> [template_name] [lang]');
  process.exit(1);
}

const { WHATSAPP_API_URL, WHATSAPP_PHONE_NUMBER_ID: PHONE_ID, WHATSAPP_ACCESS_TOKEN: TOKEN } = process.env;
const url = `${WHATSAPP_API_URL}/${PHONE_ID}/messages`;
const to = RECIPIENT.replace(/^\+/, '');

console.log(`Sending template "${TEMPLATE}" (${LANG}) to ${RECIPIENT} via ${url}`);

axios
  .post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: { name: TEMPLATE, language: { code: LANG } },
    },
    { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  )
  .then((r) => {
    console.log('SEND OK ->', JSON.stringify(r.data, null, 2));
  })
  .catch((e) => {
    console.error('SEND FAIL ->');
    console.error(JSON.stringify(e.response?.data || { message: e.message }, null, 2));
    process.exit(2);
  });
