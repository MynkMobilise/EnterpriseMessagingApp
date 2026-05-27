const campaignService = require('../services/campaignService');

// Thin HTTP wrappers around campaignService. All routes are scoped to the
// authenticated user's organization via req.organizationId — the service
// also re-checks org membership on per-id endpoints to prevent enumeration.

class CampaignController {
  list = async (req, res, next) => {
    try {
      const { search, channel, dateFrom, dateTo, page, limit } = req.query || {};
      const out = await campaignService.list(req.organizationId, {
        search,
        channel,
        dateFrom,
        dateTo,
        page: page ? Math.max(1, parseInt(page, 10)) : 1,
        limit: limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20,
      });
      res.json({ success: true, ...out });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await campaignService.getById(req.organizationId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  listMessages = async (req, res, next) => {
    try {
      const { status, page, limit } = req.query || {};
      const out = await campaignService.listMessages(req.organizationId, req.params.id, {
        status,
        page: page ? Math.max(1, parseInt(page, 10)) : 1,
        limit: limit ? Math.min(200, Math.max(1, parseInt(limit, 10))) : 50,
      });
      res.json({ success: true, ...out });
    } catch (error) {
      next(error);
    }
  };

  exportCsv = async (req, res, next) => {
    try {
      const { filename, csv } = await campaignService.exportToCsv(
        req.organizationId,
        req.params.id
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new CampaignController();
