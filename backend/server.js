require('dotenv').config();

// On dual-stack networks where IPv6 is unreachable but DNS still hands back
// AAAA records, Node 18+ defaults try IPv6 first and produce
// `getaddrinfo ENOTFOUND graph.facebook.com`. Forcing IPv4-first resolves
// outbound calls (Meta, SMTP, etc.) reliably without changing local DNS.
require('dns').setDefaultResultOrder?.('ipv4first');

const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');
const { initializeScheduledJobs } = require('./src/jobs/scheduledJobs');
const { startWorker } = require('./src/jobs/messageWorker');

const PORT = process.env.PORT || 3000;

/**
 * Build a one-line status for each globally-configured service. Per-tenant
 * services (WhatsApp, SMS) are NOT listed here — those are configured by each
 * org in the Settings UI and stored in `organization_settings`, not in .env.
 */
function summarizeServices() {
  const has = (...keys) => keys.every((k) => !!process.env[k]);
  return [
    {
      name: 'Database',
      ok: true, // we got past authenticate(), so this is a yes
      detail: `${process.env.DB_HOST || process.env.MYSQLHOST}:${process.env.DB_PORT || process.env.MYSQLPORT || 3306}/${process.env.DB_NAME || process.env.MYSQLDATABASE}`,
    },
    {
      name: 'Email (SMTP)',
      ok: has('SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'),
      detail: process.env.SMTP_HOST ? `${process.env.SMTP_USER}@${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}` : 'not configured',
    },
    {
      name: 'Encryption key',
      ok: !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64,
      detail: process.env.ENCRYPTION_KEY ? `64-hex set (persistent)` : 'MISSING — generate one with crypto.randomBytes(32).toString(\'hex\')',
    },
    {
      name: 'WhatsApp + SMS',
      ok: true,
      detail: 'per-tenant (Settings → WhatsApp / SMS API)',
    },
  ];
}

function printBanner(services) {
  const lines = [
    '',
    '╭───────────────────────────────────────────────────────────────────╮',
    `│  Enterprise Messaging API                                         │`,
    `│  http://localhost:${PORT}/api/v1                                       │`,
    `│  env: ${(process.env.NODE_ENV || 'development').padEnd(60)}│`,
    '├───────────────────────────────────────────────────────────────────┤',
  ];
  for (const s of services) {
    const icon = s.ok ? '✓' : '⊘';
    const color = s.ok ? '\x1b[32m' : '\x1b[33m';
    const reset = '\x1b[0m';
    const label = `${color}${icon}${reset} ${s.name}`.padEnd(40);
    const detail = s.detail.length > 40 ? s.detail.slice(0, 37) + '…' : s.detail;
    lines.push(`│  ${label}${detail.padEnd(27)}│`);
  }
  lines.push('╰───────────────────────────────────────────────────────────────────╯', '');
  process.stdout.write(lines.join('\n'));
}

const startServer = async () => {
  try {
    await sequelize.authenticate();

    if (process.env.NODE_ENV !== 'test') {
      initializeScheduledJobs();
      startWorker();
    }

    const server = app.listen(PORT, () => {
      printBanner(summarizeServices());
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        sequelize.close();
      });
    });
  } catch (error) {
    logger.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

