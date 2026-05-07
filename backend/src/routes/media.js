const express = require('express');
const mediaController = require('../controllers/mediaController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { mediaValidation } = require('../validations/mediaValidation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer's diskStorage doesn't create missing directories — pre-create them at
// module load so the very first upload on a fresh checkout doesn't ENOENT.
const tempDir = path.join(process.cwd(), 'uploads', 'temp');
const mediaDir = path.join(process.cwd(), 'uploads', 'media');
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Temporary storage - files will be moved by service
    cb(null, path.join(process.cwd(), 'uploads', 'temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images, videos, documents, audio
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: images, videos, documents, audio.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB
  },
});

// All routes require authentication
router.use(authenticate);

// Upload media
router.post('/',
  requirePermission('canManageTemplates'),
  upload.single('file'),
  mediaController.upload
);

// List media
router.get('/',
  validate(mediaValidation.list, 'query'),
  mediaController.list
);

// Get media statistics
router.get('/stats',
  mediaController.getStats
);

// Get media by ID
router.get('/:id',
  mediaController.getById
);

// Update media
router.put('/:id',
  requirePermission('canManageTemplates'),
  validate(mediaValidation.update, 'body'),
  mediaController.update
);

// Delete media
router.delete('/:id',
  requirePermission('canManageTemplates'),
  mediaController.delete
);

module.exports = router;

