const { Message, Template, Contact, Organization, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;
const messageService = require('../services/messageService');

class ReportController {
  /**
   * Get message statistics
   */
  async getMessageStats(req, res, next) {
    try {
      const { startDate, endDate, channel } = req.query;
      const where = {
        organizationId: req.organizationId,
      };

      if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };
      if (channel) where.channel = channel;

      const stats = await Message.findAll({
        where,
        attributes: [
          'deliveryStatus',
          'channel',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['deliveryStatus', 'channel'],
        raw: true,
      });

      const total = await Message.count({ where });
      const sent = await Message.count({ where: { ...where, deliveryStatus: 'sent' } });
      const delivered = await Message.count({ where: { ...where, deliveryStatus: 'delivered' } });
      const failed = await Message.count({ where: { ...where, deliveryStatus: 'failed' } });

      res.json({
        success: true,
        data: {
          total,
          sent,
          delivered,
          failed,
          breakdown: stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const where = {
        organizationId: req.organizationId,
        deletedAt: null,
      };

      const templates = await Template.findAll({
        where,
        attributes: [
          'id',
          'name',
          'totalSent',
          'totalDelivered',
          'totalRead',
          'totalClicked',
        ],
        order: [['totalSent', 'DESC']],
        limit: 10,
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact statistics
   */
  async getContactStats(req, res, next) {
    try {
      const stats = await Contact.findAll({
        where: {
          organizationId: req.organizationId,
          deletedAt: null,
        },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      const total = await Contact.count({
        where: {
          organizationId: req.organizationId,
          deletedAt: null,
        },
      });

      res.json({
        success: true,
        data: {
          total,
          breakdown: stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(req, res, next) {
    try {
      const organizationId = req.organizationId;

      // Get pending approvals count
      const pendingApprovals = await Message.count({
        where: {
          organizationId,
          approvalStatus: 'pending',
        },
      });

      // Get today's messages
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayMessages = await Message.count({
        where: {
          organizationId,
          createdAt: { [Op.gte]: todayStart },
        },
      });

      // Get total contacts
      const totalContacts = await Contact.count({
        where: {
          organizationId,
          deletedAt: null,
        },
      });

      // Get active templates
      const activeTemplates = await Template.count({
        where: {
          organizationId,
          status: 'approved',
          deletedAt: null,
        },
      });

      // Get channel-specific message counts (today)
      const whatsappCount = await Message.count({
        where: {
          organizationId,
          channel: 'whatsapp',
          createdAt: { [Op.gte]: todayStart },
        },
      });

      const smsCount = await Message.count({
        where: {
          organizationId,
          channel: 'sms',
          createdAt: { [Op.gte]: todayStart },
        },
      });

      const emailCount = await Message.count({
        where: {
          organizationId,
          channel: 'email',
          createdAt: { [Op.gte]: todayStart },
        },
      });

      const fcmCount = await Message.count({
        where: {
          organizationId,
          channel: 'fcm',
          createdAt: { [Op.gte]: todayStart },
        },
      });

      // Get channel-specific message counts (all time)
      const totalWhatsapp = await Message.count({
        where: {
          organizationId,
          channel: 'whatsapp',
        },
      });

      const totalSms = await Message.count({
        where: {
          organizationId,
          channel: 'sms',
        },
      });

      const totalEmail = await Message.count({
        where: {
          organizationId,
          channel: 'email',
        },
      });

      const totalFcm = await Message.count({
        where: {
          organizationId,
          channel: 'fcm',
        },
      });

      res.json({
        success: true,
        data: {
          pendingApprovals,
          todayMessages,
          totalContacts,
          activeTemplates,
          // Today's channel breakdown
          todayWhatsapp: whatsappCount,
          todaySms: smsCount,
          todayEmail: emailCount,
          todayFcm: fcmCount,
          // All-time channel breakdown
          totalWhatsapp,
          totalSms,
          totalEmail,
          totalFcm,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get message activity for dashboard (24h)
   */
  async getMessageActivity(req, res, next) {
    try {
      const organizationId = req.organizationId;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get messages grouped by hour for last 24 hours
      const messages = await Message.findAll({
        where: {
          organizationId,
          createdAt: { [Op.gte]: yesterday },
        },
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00:00'), 'hour'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
        ],
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00:00')],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00:00'), 'ASC']],
        raw: true,
      });

      // Format data for chart
      const activityData = messages.map((msg) => ({
        time: new Date(msg.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sent: parseInt(msg.count) || 0,
        delivered: parseInt(msg.delivered) || 0,
      }));

      res.json({
        success: true,
        data: activityData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template usage for dashboard
   */
  async getTemplateUsage(req, res, next) {
    try {
      const organizationId = req.organizationId;
      const templates = await Template.findAll({
        where: {
          organizationId,
          status: 'approved',
          deletedAt: null,
        },
        attributes: [
          'id',
          'name',
          [sequelize.fn('COALESCE', sequelize.col('total_sent'), 0), 'usage'],
        ],
        order: [[sequelize.fn('COALESCE', sequelize.col('total_sent'), 0), 'DESC']],
        limit: 5,
        raw: true,
      });

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      const usageData = templates.map((tpl, index) => ({
        id: tpl.id || `template-${index}-${Date.now()}`,
        name: tpl.name || 'Unnamed Template',
        value: parseInt(tpl.usage) || 0,
        color: colors[index % colors.length],
      }));

      res.json({
        success: true,
        data: usageData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get failure reasons for dashboard
   */
  async getFailureReasons(req, res, next) {
    try {
      const organizationId = req.organizationId;
      const failedMessages = await Message.findAll({
        where: {
          organizationId,
          deliveryStatus: 'failed',
        },
        attributes: [
          'failureReason',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['failureReason'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 5,
        raw: true,
      });

      const total = failedMessages.reduce((sum, msg) => sum + parseInt(msg.count || 0), 0);
      const reasons = failedMessages.map((msg) => ({
        reason: msg.failureReason || 'Unknown',
        count: parseInt(msg.count) || 0,
        percentage: total > 0 ? Math.round((parseInt(msg.count || 0) / total) * 100) : 0,
      }));

      res.json({
        success: true,
        data: reasons,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(req, res, next) {
    try {
      const organizationId = req.organizationId;
      const activities = await Message.findAll({
        where: {
          organizationId,
        },
        include: [
          {
            model: Template,
            as: 'template',
            attributes: ['name'],
            required: false,
          },
        ],
        attributes: ['id', 'channel', 'content', 'deliveryStatus', 'approvalStatus', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10,
      });

      const activityData = activities.map((msg) => ({
        id: msg.id,
        type: msg.channel,
        title: `${msg.channel.toUpperCase()} message ${msg.deliveryStatus === 'delivered' ? 'delivered' : msg.deliveryStatus === 'failed' ? 'failed' : 'sent'}`,
        template: msg.template?.name,
        time: new Date(msg.createdAt).toLocaleString(),
        status: msg.deliveryStatus || msg.approvalStatus,
      }));

      res.json({
        success: true,
        data: activityData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get message volume report
   */
  async getMessageVolumeReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      const where = { organizationId };
      if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };

      // Get daily breakdown
      const dailyData = await Message.findAll({
        where,
        attributes: [
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END")), 'approved'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END")), 'rejected'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
        raw: true,
      });

      const total = await Message.count({ where });
      const approved = await Message.count({ where: { ...where, approvalStatus: 'approved' } });
      const rejected = await Message.count({ where: { ...where, approvalStatus: 'rejected' } });
      const days = dailyData.length || 1;
      const dailyAverage = Math.round(total / days);

      res.json({
        success: true,
        data: {
          total,
          approved,
          rejected,
          dailyAverage,
          chartData: dailyData.map((d) => ({
            date: d.date,
            approved: parseInt(d.approved) || 0,
            rejected: parseInt(d.rejected) || 0,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template performance report
   */
  async getTemplatePerformanceReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      const where = { organizationId, deletedAt: null };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      const templates = await Template.findAll({
        where,
        attributes: [
          'id',
          'name',
          [sequelize.fn('COALESCE', sequelize.col('total_sent'), 0), 'sent'],
          [sequelize.fn('COALESCE', sequelize.col('total_delivered'), 0), 'delivered'],
          [sequelize.fn('COALESCE', sequelize.col('total_read'), 0), 'read'],
          [sequelize.fn('COALESCE', sequelize.col('total_clicked'), 0), 'clicked'],
        ],
        order: [[sequelize.fn('COALESCE', sequelize.col('total_sent'), 0), 'DESC']],
        limit: 10,
        raw: true,
      });

      const activeTemplates = await Template.count({ where: { ...where, status: 'approved' } });
      
      let totalSent = 0;
      let totalDelivered = 0;
      let totalRead = 0;
      let totalClicked = 0;

      const templateData = templates.map((tpl) => {
        const sent = parseInt(tpl.sent) || 0;
        const delivered = parseInt(tpl.delivered) || 0;
        const read = parseInt(tpl.read) || 0;
        const clicked = parseInt(tpl.clicked) || 0;
        
        totalSent += sent;
        totalDelivered += delivered;
        totalRead += read;
        totalClicked += clicked;

        return {
          template: tpl.name || 'Unnamed',
          sent,
          delivered,
          read,
          clicked,
        };
      });

      const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
      const avgReadRate = totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(1) : '0';
      const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';

      res.json({
        success: true,
        data: {
          activeTemplates,
          avgDeliveryRate: parseFloat(avgDeliveryRate),
          avgReadRate: parseFloat(avgReadRate),
          avgClickRate: parseFloat(avgClickRate),
          templates: templateData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get delivery success report
   */
  async getDeliverySuccessReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      const where = { organizationId };
      if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };

      const total = await Message.count({ where });
      const delivered = await Message.count({ where: { ...where, deliveryStatus: 'delivered' } });
      const failed = await Message.count({ where: { ...where, deliveryStatus: 'failed' } });
      const read = await Message.count({ where: { ...where, readAt: { [Op.ne]: null } } });

      const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0';
      const readRate = total > 0 ? ((read / total) * 100).toFixed(1) : '0';

      // Get weekly trend
      const weeklyData = await Message.findAll({
        where,
        attributes: [
          [sequelize.fn('YEARWEEK', sequelize.col('created_at')), 'week'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
        ],
        group: [sequelize.fn('YEARWEEK', sequelize.col('created_at'))],
        order: [[sequelize.fn('YEARWEEK', sequelize.col('created_at')), 'ASC']],
        limit: 12,
        raw: true,
      });

      const pieData = [
        { name: 'Delivered', value: delivered, color: '#10b981' },
        { name: 'Failed', value: failed, color: '#ef4444' },
        { name: 'Pending', value: total - delivered - failed, color: '#f59e0b' },
      ];

      const trendData = weeklyData.map((w) => ({
        week: `Week ${w.week}`,
        rate: parseInt(w.total) > 0 ? parseFloat(((parseInt(w.delivered) / parseInt(w.total)) * 100).toFixed(1)) : 0,
      }));

      res.json({
        success: true,
        data: {
          overallSuccessRate: parseFloat(successRate),
          totalDelivered: delivered,
          failed,
          readRate: parseFloat(readRate),
          pieData,
          trendData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cost analysis report
   */
  async getCostAnalysisReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      const where = { organizationId };
      if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };

      // For now, we'll use estimated costs (in production, this would come from billing data)
      const messages = await Message.findAll({
        where,
        attributes: [
          'channel',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['channel'],
        raw: true,
      });

      // Estimated costs per message (in cents)
      const costPerMessage = {
        whatsapp: 0.5, // $0.005
        sms: 1.0, // $0.01
        email: 0.1, // $0.001
        fcm: 0.0, // Free
      };

      let totalCost = 0;
      let totalMessages = 0;
      const categoryData = [];
      const countryData = []; // Placeholder - would need country data

      messages.forEach((msg) => {
        const count = parseInt(msg.count) || 0;
        const cost = (count * costPerMessage[msg.channel] || 0) / 100; // Convert to dollars
        totalCost += cost;
        totalMessages += count;
        categoryData.push({
          category: msg.channel.toUpperCase(),
          cost: parseFloat(cost.toFixed(2)),
        });
      });

      const avgCostPerMessage = totalMessages > 0 ? (totalCost / totalMessages) : 0;
      const marketingSpend = totalCost * 0.3; // Estimate 30% for marketing
      const projectedMonthly = totalCost * 30; // Estimate based on daily average

      res.json({
        success: true,
        data: {
          totalSpend: parseFloat(totalCost.toFixed(2)),
          avgCostPerMessage: parseFloat(avgCostPerMessage.toFixed(4)),
          marketingSpend: parseFloat(marketingSpend.toFixed(2)),
          projectedMonthly: parseFloat(projectedMonthly.toFixed(2)),
          categoryData,
          countryData, // Empty for now
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity report
   */
  async getUserActivityReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      const where = { organizationId };
      if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };

      // Get user stats by joining with users table
      const userStats = await sequelize.query(`
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          COUNT(m.id) as total,
          SUM(CASE WHEN m.approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN m.approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM messages m
        INNER JOIN users u ON m.sent_by = u.id
        WHERE m.organization_id = :organizationId
        ${startDate ? 'AND m.created_at >= :startDate' : ''}
        ${endDate ? 'AND m.created_at <= :endDate' : ''}
        GROUP BY u.id, u.email, u.first_name, u.last_name
        ORDER BY total DESC
        LIMIT 10
      `, {
        replacements: {
          organizationId,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        },
        type: sequelize.QueryTypes.SELECT,
      });

      const topUsers = await Message.findAll({
        attributes: [
          'sentBy',
          [sequelize.fn('COUNT', sequelize.col('messages.id')), 'total'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END")), 'approved'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END")), 'rejected'],
        ],
        where: {
          organizationId,
          deletedAt: null,
        },
        group: ['sentBy'],
        order: [[sequelize.fn('COUNT', sequelize.col('messages.id')), 'DESC']],
        limit: 10,
      });

      const activeUsers = await User.count({
        where: {
          organizationId,
          deletedAt: null,
        },
      });

      const totalMessages = await Message.count({ where });
      const avgPerUser = activeUsers > 0 ? Math.round(totalMessages / activeUsers) : 0;

      const userData = userStats.map((stat) => {
        const total = parseInt(stat.total) || 0;
        const approved = parseInt(stat.approved) || 0;
        const rejected = parseInt(stat.rejected) || 0;
        const userName = stat.first_name && stat.last_name 
          ? `${stat.first_name} ${stat.last_name}`.trim()
          : stat.email || 'Unknown';

        return {
          user: userName,
          dept: 'N/A', // Would need department data
          messages: total,
          approved,
          rejected,
        };
      });

      const topSender = userData.length > 0 ? userData[0].user : '-';
      const topSenderMessages = userData.length > 0 ? userData[0].messages : 0;

      res.json({
        success: true,
        data: {
          activeUsers,
          topSender,
          topSenderMessages,
          avgPerUser,
          mostActiveDept: 'N/A', // Would need department data
          users: userData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get channel comparison report
   */
  async getChannelComparisonReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      const where = { organizationId };
      if (startDate) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };

      const channelStats = await Message.findAll({
        where,
        attributes: [
          'channel',
          [sequelize.fn('COUNT', sequelize.col('id')), 'sent'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END")), 'read'],
        ],
        group: ['channel'],
        raw: true,
      });

      const total = await Message.count({ where });
      const costPerMessage = {
        whatsapp: 0.5,
        sms: 1.0,
        email: 0.1,
        fcm: 0.0,
      };

      const comparisonData = channelStats.map((stat) => {
        const sent = parseInt(stat.sent) || 0;
        const delivered = parseInt(stat.delivered) || 0;
        const read = parseInt(stat.read) || 0;
        const cost = (sent * costPerMessage[stat.channel] || 0) / 100;

        return {
          channel: stat.channel.toUpperCase(),
          sent,
          delivered,
          read,
          cost: parseFloat(cost.toFixed(2)),
        };
      });

      const whatsappShare = total > 0 ? ((channelStats.find((s) => s.channel === 'whatsapp')?.sent || 0) / total * 100).toFixed(1) : '0';
      const smsShare = total > 0 ? ((channelStats.find((s) => s.channel === 'sms')?.sent || 0) / total * 100).toFixed(1) : '0';

      const whatsappReadRate = channelStats.find((s) => s.channel === 'whatsapp');
      const smsReadRate = channelStats.find((s) => s.channel === 'sms');

      const whatsappRead = whatsappReadRate ? (parseInt(whatsappReadRate.sent) > 0 ? ((parseInt(whatsappReadRate.read) / parseInt(whatsappReadRate.sent)) * 100).toFixed(1) : '0') : '0';
      const smsRead = smsReadRate ? (parseInt(smsReadRate.sent) > 0 ? ((parseInt(smsReadRate.read) / parseInt(smsReadRate.sent)) * 100).toFixed(1) : '0') : '0';

      // Get monthly trend
      const monthlyData = await Message.findAll({
        where,
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
          'channel',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['month', 'channel'],
        order: [['month', 'ASC']],
        limit: 12,
        raw: true,
      });

      const trendData = {};
      monthlyData.forEach((d) => {
        if (!trendData[d.month]) {
          trendData[d.month] = { month: d.month, whatsapp: 0, sms: 0, email: 0, fcm: 0 };
        }
        trendData[d.month][d.channel] = parseInt(d.count) || 0;
      });

      res.json({
        success: true,
        data: {
          whatsappShare: parseFloat(whatsappShare),
          smsShare: parseFloat(smsShare),
          whatsappReadRate: parseFloat(whatsappRead),
          smsReadRate: parseFloat(smsRead),
          comparisonData,
          trendData: Object.values(trendData),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All Messages Report
   */
  async getAllMessagesReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId;

      // Fetch all messages (no pagination for report)
      const filters = {
        startDate,
        endDate,
        page: 1,
        limit: 10000, // Large limit to get all messages
      };

      const result = await messageService.list(organizationId, filters);
      const messages = result.messages || [];

      // Calculate statistics
      const total = messages.length;
      const byChannel = {
        whatsapp: messages.filter(m => m.channel === 'whatsapp').length,
        sms: messages.filter(m => m.channel === 'sms').length,
        email: messages.filter(m => m.channel === 'email').length,
        fcm: messages.filter(m => m.channel === 'fcm').length,
      };
      const byStatus = {
        sent: messages.filter(m => m.deliveryStatus === 'sent').length,
        delivered: messages.filter(m => m.deliveryStatus === 'delivered').length,
        failed: messages.filter(m => m.deliveryStatus === 'failed').length,
        pending: messages.filter(m => m.deliveryStatus === 'pending').length,
      };
      const byApprovalStatus = {
        approved: messages.filter(m => m.approvalStatus === 'approved').length,
        rejected: messages.filter(m => m.approvalStatus === 'rejected').length,
        pending: messages.filter(m => m.approvalStatus === 'pending').length,
      };

      // Get daily breakdown
      const dailyData = {};
      messages.forEach((msg) => {
        const date = msg.createdAt ? new Date(msg.createdAt).toISOString().split('T')[0] : 'Unknown';
        if (!dailyData[date]) {
          dailyData[date] = { date, total: 0, byChannel: { whatsapp: 0, sms: 0, email: 0, fcm: 0 }, byStatus: { sent: 0, delivered: 0, failed: 0, pending: 0 } };
        }
        dailyData[date].total++;
        if (msg.channel && dailyData[date].byChannel[msg.channel] !== undefined) {
          dailyData[date].byChannel[msg.channel]++;
        }
        if (msg.deliveryStatus && dailyData[date].byStatus[msg.deliveryStatus] !== undefined) {
          dailyData[date].byStatus[msg.deliveryStatus]++;
        }
      });

      const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        success: true,
        data: {
          total,
          byChannel,
          byStatus,
          byApprovalStatus,
          chartData,
          messages: messages.map(msg => {
            const plain = msg.toJSON ? msg.toJSON() : msg;
            return {
              ...plain,
              recipientPhone: plain.recipientPhone || plain.contact?.phoneNumber,
              recipientEmail: plain.recipientEmail || plain.contact?.email,
              recipientFcmToken: plain.recipientFcmToken,
              template: plain.template || null,
              sentByUser: plain.sentByUser || null,
            };
          }),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();


