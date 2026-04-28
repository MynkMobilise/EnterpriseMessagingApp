/**
 * Test script to verify SMTP connection with TLS options
 * This will test the actual connection (without sending email)
 */

const nodemailer = require('nodemailer');

console.log('🧪 Testing SMTP Connection with TLS Options\n');
console.log('='.repeat(60));

// Configuration from PHP script
const config = {
  host: 'mail.mobilisepro.com',
  port: 587,
  secure: false,  // STARTTLS
  requireTLS: true,
  auth: {
    user: 'testsmtp@mobilisepro.com',
    pass: 'nl944Zr2kw65AIqLXvvSK18P'
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  // TLS options to handle self-signed certificates
  tls: {
    rejectUnauthorized: false  // Accept self-signed certificates
  }
};

console.log('Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  Secure: ${config.secure} (STARTTLS)`);
console.log(`  RequireTLS: ${config.requireTLS}`);
console.log(`  TLS rejectUnauthorized: ${config.tls.rejectUnauthorized}`);
console.log('');

// Create transporter
console.log('Creating transporter...');
const transporter = nodemailer.createTransport(config);

// Verify connection
console.log('Verifying SMTP connection...');
console.log('(This will test the connection without sending an email)\n');

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Connection failed:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('\n  This is an authentication error.');
      console.error('  Check username and password.');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n  This is a connection error.');
      console.error('  Check host, port, and network connectivity.');
    } else if (error.message && error.message.includes('certificate')) {
      console.error('\n  This is a certificate verification error.');
      console.error('  The TLS fix should resolve this.');
    }
    
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('  Server:', success);
    console.log('\n✅ SMTP configuration is correct!');
    console.log('✅ TLS options are working!');
    console.log('✅ Ready to send emails!');
    process.exit(0);
  }
});

