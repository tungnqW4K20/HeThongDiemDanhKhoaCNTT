'use strict';
const DashboardService = require('../services/dashboard.service');

class DashboardController {
  /**
   * Lấy toàn bộ dữ liệu Dashboard
   * GET /api/dashboard/overview?filter=week
   */
  static async getOverviewData(req, res) {
    try {
      const filter = req.query.filter || 'week';
      const year   = req.query.year  ? parseInt(req.query.year)  : undefined;
      const month  = req.query.month ? parseInt(req.query.month) : undefined;

      // Xử lý song song 4 tác vụ chính
      const [stats, chartData, todaySchedule, alerts] = await Promise.all([
        DashboardService.getStatsByClass(),
        DashboardService.getChartData(filter, year, month),
        DashboardService.getTodaySchedule(),
        DashboardService.getAlerts()
      ]);

      // Đồng bộ số lượng cảnh báo thực tế
      if (stats) {
        stats.alertCount = alerts.length;
      }      
      return res.status(200).json({
        success: true,
        message: 'Tải dữ liệu tổng quan Dashboard thành công',
        data: { stats, chartData, todaySchedule, alerts }
      });

    } catch (error) {
      console.error('[Dashboard Controller Error]:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải dữ liệu Dashboard.',
        error: error.message
      });
    }
  }

  /**
   * Lấy dữ liệu biểu đồ (Lazy load)
   */
  static async getChartDataOnly(req, res) {
    try {
      const filter = req.query.filter || 'week';
      const year   = req.query.year  ? parseInt(req.query.year)  : undefined;
      const month  = req.query.month ? parseInt(req.query.month) : undefined;
      const data = await DashboardService.getChartData(filter, year, month);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = DashboardController;