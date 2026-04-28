require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');
const { initializeScheduledJobs } = require('./src/jobs/scheduledJobs');
const { startWorker } = require('./src/jobs/messageWorker');

const PORT = process.env.PORT || 3000;

// Sync database and start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ MySQL connection established successfully');

    // Sync models (use migrations in production)
    // Disabled alter sync to avoid deadlocks - use migrations instead
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: true });
    //   logger.info('✅ Database synchronized');
    // }

    // Initialize scheduled jobs
    if (process.env.NODE_ENV !== 'test') {
      initializeScheduledJobs();
      // Start message worker
      startWorker();
      logger.info('✅ Message worker started');
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
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

