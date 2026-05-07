const { Media } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class MediaService {
  /**
   * Upload media file
   */
  async upload(organizationId, uploadedBy, file, metadata = {}) {
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // Validate file size (16MB max)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      throw new AppError('File size exceeds 16MB limit', 400);
    }

    // Determine media type from mime type
    const mimeType = file.mimetype;
    let mediaType = 'document';
    if (mimeType.startsWith('image/')) {
      mediaType = 'image';
    } else if (mimeType.startsWith('video/')) {
      mediaType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      mediaType = 'audio';
    }

    // Calculate checksum
    const fileBuffer = await fs.readFile(file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check for duplicate (same checksum in same organization)
    const existing = await Media.findOne({
      where: {
        organizationId,
        checksum,
        deletedAt: null,
      },
    });

    if (existing) {
      // Delete uploaded file if duplicate exists
      await fs.unlink(file.path).catch(() => {});
      return existing;
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const storageDir = path.join(process.cwd(), 'uploads', 'media', String(organizationId));
    await fs.mkdir(storageDir, { recursive: true });
    const storagePath = path.join(storageDir, uniqueName);

    // Move file to storage
    await fs.rename(file.path, storagePath);

    // Generate URL (in production, this would be a CDN URL)
    const url = `/uploads/media/${organizationId}/${uniqueName}`;

    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Extract dimensions if image
    let width = null;
    let height = null;
    if (mediaType === 'image') {
      // In production, use sharp or similar to get dimensions
      // For now, we'll skip this
    }

    const media = await Media.create({
      organizationId,
      uploadedBy,
      name: file.originalname,
      originalName: file.originalname,
      type: mediaType,
      mimeType,
      size: file.size,
      url,
      storagePath,
      checksum,
      width,
      height,
      expiresAt,
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString(),
      },
    });

    return media;
  }

  /**
   * List media files
   */
  async list(organizationId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      search,
    } = filters;

    const where = {
      organizationId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { originalName: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Media.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });

    return {
      media: rows,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Get media by ID
   */
  async getById(id, organizationId) {
    const media = await Media.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!media) {
      throw new NotFoundError('Media');
    }

    return media;
  }

  /**
   * Update media metadata
   */
  async update(id, organizationId, data) {
    const media = await this.getById(id, organizationId);

    // Only allow updating name and metadata
    const updateData = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.metadata !== undefined) {
      updateData.metadata = {
        ...media.metadata,
        ...data.metadata,
      };
    }

    await media.update(updateData);
    await media.reload();

    return media;
  }

  /**
   * Delete media (soft delete)
   */
  async delete(id, organizationId) {
    const media = await this.getById(id, organizationId);

    // Soft delete
    await media.destroy();

    // Optionally delete physical file
    // await fs.unlink(media.storagePath).catch(() => {});

    return { message: 'Media deleted successfully' };
  }

  /**
   * Get media statistics
   */
  async getStats(organizationId) {
    const media = await Media.findAll({
      where: {
        organizationId,
        deletedAt: null,
      },
      attributes: ['type', 'size'],
    });

    const stats = {
      total: media.length,
      storageUsed: 0,
      images: 0,
      videos: 0,
      documents: 0,
      audio: 0,
    };

    media.forEach((item) => {
      stats.storageUsed += item.size || 0;
      if (item.type === 'image') stats.images++;
      else if (item.type === 'video') stats.videos++;
      else if (item.type === 'document') stats.documents++;
      else if (item.type === 'audio') stats.audio++;
    });

    // Convert bytes to MB
    stats.storageUsed = Math.round((stats.storageUsed / (1024 * 1024)) * 100) / 100;

    return stats;
  }
}

module.exports = new MediaService();

