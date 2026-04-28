require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const {
  WHATSAPP_API_URL,
  WHATSAPP_BUSINESS_ACCOUNT_ID: WABA_ID,
  WHATSAPP_PHONE_NUMBER_ID: PHONE_ID,
  WHATSAPP_ACCESS_TOKEN: TOKEN,
} = process.env;

const mask = (s) => (s ? s.slice(0, 8) + '...' + s.slice(-6) + ` (len=${s.length})` : '<missing>');

(async () => {
  console.log('=== WhatsApp credentials smoke test ===');
  console.log('API URL :', WHATSAPP_API_URL);
  console.log('WABA ID :', WABA_ID);
  console.log('Phone ID:', PHONE_ID);
  console.log('Token   :', mask(TOKEN));
  console.log('');

  if (!TOKEN || !PHONE_ID || !WABA_ID) {
    console.error('Missing one of WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_BUSINESS_ACCOUNT_ID');
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${TOKEN}` };

  // Test 1: who am I (token introspection via /me)
  try {
    const r = await axios.get(`https://graph.facebook.com/v18.0/me`, { headers: auth, timeout: 10000 });
    console.log('[1/4] /me OK ->', r.data);
  } catch (e) {
    console.error('[1/4] /me FAIL ->', e.response?.data?.error || e.message);
  }

  // Test 2: phone number node
  try {
    const r = await axios.get(
      `${WHATSAPP_API_URL}/${PHONE_ID}`,
      { headers: auth, params: { fields: 'id,display_phone_number,verified_name,quality_rating' }, timeout: 10000 }
    );
    console.log('[2/4] /phone OK ->', r.data);
  } catch (e) {
    console.error('[2/4] /phone FAIL ->', e.response?.data?.error || e.message);
  }

  // Test 3: WABA node
  try {
    const r = await axios.get(
      `${WHATSAPP_API_URL}/${WABA_ID}`,
      { headers: auth, params: { fields: 'id,name,currency,timezone_id' }, timeout: 10000 }
    );
    console.log('[3/4] /waba OK ->', r.data);
  } catch (e) {
    console.error('[3/4] /waba FAIL ->', e.response?.data?.error || e.message);
  }

  // Test 4: list message templates
  try {
    const r = await axios.get(
      `${WHATSAPP_API_URL}/${WABA_ID}/message_templates`,
      { headers: auth, params: { fields: 'name,status,language,category', limit: 25 }, timeout: 10000 }
    );
    const templates = r.data?.data || [];
    console.log(`[4/4] /message_templates OK -> ${templates.length} templates`);
    templates.forEach((t, i) =>
      console.log(`   ${i + 1}. name="${t.name}" lang=${t.language} status=${t.status} category=${t.category}`)
    );
  } catch (e) {
    console.error('[4/4] /message_templates FAIL ->', e.response?.data?.error || e.message);
  }
})();
