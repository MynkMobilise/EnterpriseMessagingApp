/**
 * End-to-end smoke test for the new Meta-integrated template lifecycle.
 *  1. Create a fresh draft template in the local DB
 *  2. Call templateService.submitForApproval — should POST to Meta
 *  3. Verify whatsappTemplateId is populated and whatsappStatus='pending'
 *  4. Simulate Meta sending a message_template_status_update webhook (APPROVED)
 *  5. Verify the row flips to whatsappStatus='approved' + status='approved'
 *  6. Cleanup (soft-delete the test template)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const { Template, OrganizationSettings } = require('../src/models');
const templateService = require('../src/services/templateService');
const whatsappService = require('../src/services/whatsappService');

const TEST_NAME = `lifecycle_smoke_${Date.now()}`;

(async () => {
  await sequelize.authenticate();
  console.log('=== Template lifecycle smoke test ===\n');

  // 1. Find an org with WhatsApp configured + a user to attribute to
  const settings = await OrganizationSettings.findOne({
    where: {},
    order: [['updated_at', 'DESC']],
  });
  if (!settings || !settings.whatsappBusinessAccountId || !settings.whatsappAccessToken) {
    console.error('No org with WhatsApp configured. Aborting.');
    process.exit(1);
  }
  const orgId = settings.organizationId;
  const [users] = await sequelize.query(
    `SELECT id, email FROM users WHERE organization_id = :oid AND deleted_at IS NULL LIMIT 1`,
    { replacements: { oid: orgId } }
  );
  if (users.length === 0) {
    console.error('No user in org to attribute template to.');
    process.exit(1);
  }
  const userId = users[0].id;
  console.log(`Org: ${orgId}\nUser: ${users[0].email}\n`);

  // 2. Create a draft template
  console.log(`[1] Creating draft template "${TEST_NAME}"...`);
  const draft = await Template.create({
    organizationId: orgId,
    createdBy: userId,
    name: TEST_NAME,
    channel: 'whatsapp',
    category: 'utility',
    language: 'en_US',
    body: 'Hi {{1}}, this is a smoke test for the template approval pipeline.',
    variables: ['1'],
    variableCount: 1,
    status: 'draft',
  });
  console.log(`    template.id = ${draft.id}\n`);

  // 3. Submit to Meta
  console.log('[2] Submitting to Meta via templateService.submitForApproval...');
  let submitted;
  try {
    submitted = await templateService.submitForApproval(draft.id, orgId);
  } catch (e) {
    console.error('    SUBMIT FAILED:', e.message);
    await draft.destroy({ force: true });
    process.exit(2);
  }
  console.log(`    Returned status=${submitted.status}, whatsappStatus=${submitted.whatsappStatus}`);
  console.log(`    whatsappTemplateId=${submitted.whatsappTemplateId}\n`);

  if (!submitted.whatsappTemplateId) {
    console.error('Meta did not return a template id. Aborting.');
    await draft.destroy({ force: true });
    process.exit(3);
  }
  if (submitted.status !== 'pending_approval') {
    console.error(`Expected status='pending_approval', got '${submitted.status}'.`);
    await draft.destroy({ force: true });
    process.exit(3);
  }

  // 4. Simulate webhook: Meta sends APPROVED for this template id
  console.log('[3] Simulating Meta webhook: message_template_status_update event=APPROVED ...');
  const fakeEvent = {
    entry: [
      {
        changes: [
          {
            field: 'message_template_status_update',
            value: {
              event: 'APPROVED',
              message_template_id: submitted.whatsappTemplateId,
              message_template_name: submitted.name,
              message_template_language: submitted.language,
              reason: null,
            },
          },
        ],
      },
    ],
  };
  await whatsappService.processWebhook(fakeEvent);

  // 5. Verify the row is updated
  await submitted.reload();
  console.log(`    Now status=${submitted.status}, whatsappStatus=${submitted.whatsappStatus}\n`);
  if (submitted.status !== 'approved' || submitted.whatsappStatus !== 'approved') {
    console.error('Webhook did not flip status. FAIL.');
    await submitted.destroy({ force: true });
    process.exit(4);
  }
  console.log('[4] ✅ Webhook flipped status to approved.\n');

  // 6. Test the REJECTED path too
  console.log('[5] Simulating webhook with event=REJECTED to verify rejection path...');
  fakeEvent.entry[0].changes[0].value.event = 'REJECTED';
  fakeEvent.entry[0].changes[0].value.reason = 'Smoke-test rejection (not from Meta)';
  await whatsappService.processWebhook(fakeEvent);
  await submitted.reload();
  console.log(`    Now status=${submitted.status}, whatsappStatus=${submitted.whatsappStatus}, reason=${submitted.whatsappRejectionReason}\n`);
  if (submitted.status !== 'rejected') {
    console.error('Rejection path failed.');
    await submitted.destroy({ force: true });
    process.exit(5);
  }
  console.log('[6] ✅ Rejection path works.\n');

  // Cleanup — also delete the template from Meta to keep WABA clean
  console.log('[7] Cleaning up: hard-deleting test template from local DB.');
  await submitted.destroy({ force: true });
  console.log('    (Note: the template still exists in Meta. Delete via Meta Manager if you want to free the slot.)\n');

  console.log('=== ALL CHECKS PASSED ===');
  await sequelize.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
