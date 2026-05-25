/**
 * HTTP wrappers for the Leadership Dashboard. Thin — all logic lives in
 * leadershipDashboardService.
 */
const leadershipDashboardService = require('../services/leadershipDashboardService');

class LeadershipDashboardController {
  /** GET /dashboard/leadership — full dashboard payload, scoped by filters. */
  async getDashboard(req, res, next) {
    try {
      const data = await leadershipDashboardService.getDashboard(
        req.organizationId,
        req.query
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  /** GET /dashboard/leadership/filters — distinct values for the filter dropdowns. */
  async getFilterOptions(req, res, next) {
    try {
      const data = await leadershipDashboardService.getFilterOptions(
        req.organizationId
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new LeadershipDashboardController();
