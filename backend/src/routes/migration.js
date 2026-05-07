/**
 * Migration routes
 * NOTE: This endpoint can be kept for future migrations or removed if not needed
 * Migration completed: 2025-12-09 - Added 'processing' status to delivery_status ENUM
 */

const express = require('express');
const router = express.Router();
const migrate = require('../../scripts/migrate-add-processing-status-railway');

/**
 * POST /api/v1/migration/add-processing-status
 * Add 'processing' status to delivery_status ENUM
 */
router.post('/add-processing-status', async (req, res) => {
  try {
    if (process.env.VERBOSE === 'true') console.log('Starting migration: Add processing status to delivery_status ENUM');
    await migrate();
    res.json({ 
      success: true, 
      message: 'Migration completed successfully. "processing" status added to delivery_status ENUM.' 
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack 
    });
  }
});

module.exports = router;

