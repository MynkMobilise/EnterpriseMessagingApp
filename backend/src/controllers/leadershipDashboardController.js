/**
 * HTTP wrappers for the Leadership Dashboard. Thin — all logic lives in
 * leadershipDashboardService.
 */
const leadershipDashboardService = require('../services/leadershipDashboardService');

class LeadershipDashboardController {
  /** GET /dashboard/leadership — full dashboard payload, scoped by filters.
   *  When the caller is a non-privileged role (operator/viewer), the service
   *  further scopes every aggregate to messages whose recipient contacts
   *  belong to a contact group the user is assigned to. Admins/managers see
   *  the org-wide view. */
  async getDashboard(req, res, next) {
    try {
      const data = await leadershipDashboardService.getDashboard(
        req.organizationId,
        req.query,
        { userId: req.user.id, role: req.user.role }
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
