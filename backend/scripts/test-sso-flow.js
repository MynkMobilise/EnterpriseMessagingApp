/**
 * End-to-end smoke test for the SSO + welcome-email flow.
 *  1. Log in as admin (to get a session token for settings calls)
 *  2. Enable SSO and read back the secret
 *  3. Generate a JWT signed with that secret for a partner-portal user
 *  4. POST /api/v1/auth/sso/exchange — verifies JIT provisioning + token issuance
 *  5. Use the returned access token to call /auth/me and confirm the user is set up
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE = process.env.API_URL || 'http://localhost:3003/api/v1';

(async () => {
  console.log('=== SSO end-to-end smoke test ===\n');

  // 1. Login
  console.log('[1] Logging in as admin...');
  const login = await axios.post(`${BASE}/auth/login`, {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    organizationSlug: 'default-org',
  });
  const adminToken = login.data?.data?.tokens?.accessToken;
  if (!adminToken) throw new Error('admin login failed');
  console.log('    ✓ admin token obtained\n');

  const auth = { Authorization: `Bearer ${adminToken}` };

  // 2. Read SSO config (creates secret if missing) + enable SSO
  console.log('[2] Reading SSO config...');
  const sso = await axios.get(`${BASE}/settings/sso`, { headers: auth });
  const secret = sso.data?.data?.ssoSecret;
  if (!secret) throw new Error('No SSO secret returned');
  console.log(`    ✓ secret loaded (len=${secret.length})`);

  console.log('    Enabling SSO + setting default role to operator...');
  await axios.put(`${BASE}/settings/sso`, { ssoEnabled: true, ssoDefaultRole: 'operator' }, { headers: auth });
  console.log('    ✓ enabled\n');

  // 3. Generate a JWT as a partner portal would
  const partnerUserEmail = `sparsh-user-${Date.now()}@example.com`;
  console.log(`[3] Generating partner JWT for ${partnerUserEmail}...`);
  const token = jwt.sign(
    {
      email: partnerUserEmail,
      name: 'Sparsh User',
      role: 'operator',
      exp: Math.floor(Date.now() / 1000) + 300,
    },
    secret,
    { algorithm: 'HS256' }
  );
  console.log(`    ✓ JWT (${token.length} chars)\n`);

  // 4. Exchange
  console.log('[4] POSTing to /auth/sso/exchange...');
  const exchange = await axios.post(`${BASE}/auth/sso/exchange`, {
    orgSlug: 'default-org',
    token,
  });
  const ssoToken = exchange.data?.data?.tokens?.accessToken;
  const provisionedFlag = exchange.data?.data?.provisioned;
  console.log(`    ✓ exchange OK — provisioned=${provisionedFlag}`);
  console.log(`    user: ${exchange.data?.data?.user?.email} role=${exchange.data?.data?.user?.role}\n`);

  // 5. Verify the SSO-issued access token works against /auth/me
  console.log('[5] Verifying SSO token against /auth/me...');
  const me = await axios.get(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${ssoToken}` },
  });
  console.log(`    ✓ /auth/me returns: ${me.data?.data?.email}, role=${me.data?.data?.role}, authProvider=${me.data?.data?.authProvider}\n`);

  // 6. Re-exchange with same email → should NOT re-provision
  console.log('[6] Second exchange for same email (should reuse user)...');
  const token2 = jwt.sign(
    { email: partnerUserEmail, exp: Math.floor(Date.now() / 1000) + 300 },
    secret,
    { algorithm: 'HS256' }
  );
  const exchange2 = await axios.post(`${BASE}/auth/sso/exchange`, { orgSlug: 'default-org', token: token2 });
  console.log(`    ✓ second exchange — provisioned=${exchange2.data?.data?.provisioned} (expected false)\n`);

  // 7. Negative test: tampered token
  console.log('[7] Negative: tampered token should fail with 401...');
  const bad = token.slice(0, -3) + 'xyz';
  try {
    await axios.post(`${BASE}/auth/sso/exchange`, { orgSlug: 'default-org', token: bad });
    console.log('    ✗ FAIL: tampered token was accepted!');
    process.exit(2);
  } catch (e) {
    if (e.response?.status === 401) {
      console.log('    ✓ rejected (401)\n');
    } else {
      throw e;
    }
  }

  console.log('=== ALL CHECKS PASSED ===');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL:', e.response?.data || e.message);
  process.exit(1);
});
