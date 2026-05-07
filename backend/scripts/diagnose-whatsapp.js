require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'mysql',
  logging: false,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected.\n');

    console.log('=== organization_settings (WhatsApp fields) ===');
    const [settings] = await sequelize.query(`
      SELECT
        os.id,
        o.name AS org_name,
        o.id AS org_id,
        os.whatsapp_business_account_id AS waba_id,
        os.whatsapp_phone_number_id AS phone_id,
        os.whatsapp_api_version AS api_version,
        CASE WHEN os.whatsapp_access_token IS NULL OR os.whatsapp_access_token = ''
             THEN 'NULL/EMPTY'
             ELSE CONCAT('SET (len=', LENGTH(os.whatsapp_access_token), ')') END AS access_token_state,
        CASE WHEN os.whatsapp_app_secret IS NULL OR os.whatsapp_app_secret = ''
             THEN 'NULL/EMPTY'
             ELSE CONCAT('SET (len=', LENGTH(os.whatsapp_app_secret), ')') END AS app_secret_state,
        os.updated_at
      FROM organization_settings os
      JOIN organizations o ON o.id = os.organization_id
      ORDER BY os.updated_at DESC
    `);
    console.table(settings);

    console.log('\n=== Latest 10 WhatsApp messages ===');
    const [messages] = await sequelize.query(`
      SELECT
        id,
        recipient_phone,
        delivery_status,
        approval_status,
        failure_reason,
        external_message_id,
        created_at,
        sent_at,
        failed_at
      FROM messages
      WHERE channel = 'whatsapp'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    if (messages.length === 0) {
      console.log('(no whatsapp messages yet)');
    } else {
      console.table(messages);
    }

    console.log('\n=== Latest trace logs for those messages ===');
    if (messages.length > 0) {
      const ids = messages.map((m) => `'${m.id}'`).join(',');
      const [traces] = await sequelize.query(`
        SELECT message_id, event_type, event_data, created_at
        FROM message_events
        WHERE message_id IN (${ids})
        ORDER BY created_at DESC
        LIMIT 30
      `);
      traces.forEach((t) => {
        const data = typeof t.event_data === 'string' ? t.event_data : JSON.stringify(t.event_data);
        console.log(`[${t.created_at.toISOString()}] msg=${t.message_id.slice(0, 8)} ${t.event_type} ${data?.slice(0, 200) || ''}`);
      });
    }

    await sequelize.close();
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  }
})();
