const mediaService = require('../services/mediaService');
const { NotFoundError } = require('../utils/errorTypes');

class MediaController {
  /**
   * Upload media
   */
  async upload(req, res, next) {
    try {
      const media = await mediaService.upload(
        req.organizationId,
        req.user.id,
        req.file,
        req.body
      );
      res.status(201).json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List media
   */
  async list(req, res, next) {
    try {
      const result = await mediaService.list(req.organizationId, req.query);
      res.json({
        success: true,
        data: {
          media: result.media,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get media by ID
   */
  async getById(req, res, next) {
    try {
      const media = await mediaService.getById(req.params.id, req.organizationId);
      res.json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update media metadata
   */
  async update(req, res, next) {
    try {
      const media = await mediaService.update(
        req.params.id,
        req.organizationId,
        req.body
      );
      res.json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete media
   */
  async delete(req, res, next) {
    try {
      const result = await mediaService.delete(req.params.id, req.organizationId);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get media statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await mediaService.getStats(req.organizationId);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MediaController();

