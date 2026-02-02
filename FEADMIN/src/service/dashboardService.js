'use strict';
import axiosClient from './axiosClient';

const dashboardService = {
  /**
   * Lấy toàn bộ dữ liệu tổng quan cho Dashboard
   * @param {string} filter 'day' | 'week' | 'month'
   */
  getOverview(filter = 'week') {
    return axiosClient.get(`/thong-ke/overview?filter=${filter}`);
  },

  /**
   * Lấy riêng dữ liệu biểu đồ khi thay đổi bộ lọc
   * @param {string} filter 'day' | 'week' | 'month'
   */
  getChartData(filter) {
    return axiosClient.get(`/thong-ke/chart?filter=${filter}`);
  }
};

export default dashboardService;