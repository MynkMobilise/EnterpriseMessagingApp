const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Only load .env file in development/local environments
// In production (Render), use environment variables from Render dashboard only
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// #region agent log
// Log dotenv file existence check and NODE_ENV
const envPath = path.join(__dirname, '../../.env');
const envExists = fs.existsSync(envPath);
const logData1 = {location:'database.js:10',message:'Environment check',data:{envPath,envExists,NODE_ENV:process.env.NODE_ENV,dotenvLoaded:process.env.NODE_ENV !== 'production'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
console.log('[DEBUG]', JSON.stringify(logData1));
fetch('http://127.0.0.1:7242/ingest/ad4dae2f-f59c-4af9-b389-01e1fbb979dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
// #endregion agent log

// #region agent log
// Log all relevant environment variables BEFORE building config
const envVars = {
  MYSQLDATABASE: process.env.MYSQLDATABASE,
  MYSQLHOST: process.env.MYSQLHOST,
  MYSQL_HOST: process.env.MYSQL_HOST,
  MYSQLPORT: process.env.MYSQLPORT,
  MYSQL_PORT: process.env.MYSQL_PORT,
  MYSQLUSER: process.env.MYSQLUSER,
  MYSQLPASSWORD: process.env.MYSQLPASSWORD ? '***SET***' : undefined,
  MYSQL_ROOT_PASSWORD: process.env.MYSQL_ROOT_PASSWORD ? '***SET***' : undefined,
  DB_NAME: process.env.DB_NAME,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ? '***SET***' : undefined,
  NODE_ENV: process.env.NODE_ENV,
};
const logData2 = {location:'database.js:32',message:'Environment variables before config',data:envVars,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
console.log('[DEBUG]', JSON.stringify(logData2));
fetch('http://127.0.0.1:7242/ingest/ad4dae2f-f59c-4af9-b389-01e1fbb979dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
// #endregion agent log

// Support both Railway auto-generated variables and custom DB_ variables
// Railway variables take precedence if available
const dbConfig = {
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  username: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST,
  port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
};

// Validate database configuration - all required fields must be set
if (!dbConfig.host || !dbConfig.database || !dbConfig.username || !dbConfig.password) {
  const missing = [];
  if (!dbConfig.host) missing.push('host');
  if (!dbConfig.database) missing.push('database');
  if (!dbConfig.username) missing.push('username');
  if (!dbConfig.password) missing.push('password');
  
  const errorMsg = `❌ Database configuration incomplete. Missing: ${missing.join(', ')}. ` +
    `Please set Railway variables (MYSQLHOST, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD) or ` +
    `custom variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) in Render environment variables.`;
  
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// #region agent log
// Log final dbConfig values (mask password)
const dbConfigLog = {
  database: dbConfig.database,
  username: dbConfig.username,
  password: dbConfig.password ? '***SET***' : undefined,
  host: dbConfig.host,
  port: dbConfig.port,
  allUndefined: !dbConfig.database && !dbConfig.username && !dbConfig.password && !dbConfig.host,
};
const logData3 = {location:'database.js:55',message:'Final dbConfig values',data:dbConfigLog,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
console.log('[DEBUG]', JSON.stringify(logData3));
fetch('http://127.0.0.1:7242/ingest/ad4dae2f-f59c-4af9-b389-01e1fbb979dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
// #endregion agent log

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      underscored: false,
      freezeTableName: true,
      timestamps: true,
    },
  }
);

// Test connection
const testConnection = async () => {
  try {
    // #region agent log
    // Log connection attempt with actual connection config
    const connectionConfig = {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
    };
    const logData4 = {location:'database.js:96',message:'Attempting database connection',data:connectionConfig,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
    console.log('[DEBUG]', JSON.stringify(logData4));
    fetch('http://127.0.0.1:7242/ingest/ad4dae2f-f59c-4af9-b389-01e1fbb979dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch(()=>{});
    // #endregion agent log
    
    await sequelize.authenticate();
    
    // #region agent log
    // Log successful connection
    const logData5 = {location:'database.js:107',message:'Database connection successful',data:{host:dbConfig.host,port:dbConfig.port,database:dbConfig.database},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
    console.log('[DEBUG]', JSON.stringify(logData5));
    fetch('http://127.0.0.1:7242/ingest/ad4dae2f-f59c-4af9-b389-01e1fbb979dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData5)}).catch(()=>{});
    // #endregion agent log
    
    console.log('✅ MySQL connection established successfully');
  } catch (error) {
    // #region agent log
    // Log connection error with details
    const logData6 = {location:'database.js:114',message:'Database connection failed',data:{error:error.message,code:error.code,host:dbConfig.host,port:dbConfig.port},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
    console.log('[DEBUG]', JSON.stringify(logData6));
    fetch('http://127.0.0.1:7242/ingest/ad4dae2f-f59c-4af9-b389-01e1fbb979dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData6)}).catch(()=>{});
    // #endregion agent log
    
    console.error('❌ Unable to connect to MySQL:', error);
    throw error;
  }
};

// Only test connection if not in test environment (tests will handle their own connections)
if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

module.exports = sequelize;


