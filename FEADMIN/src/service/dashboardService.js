'use strict';
import axiosClient from './axiosClient';

const dashboardService = {
  /**
   * Lấy dữ liệu tổng quan dashboard (số lượng SV, GV, Lớp...)
   */
  getOverview(filter = 'week', year, month) {
    let url = `/thong-ke/overview?filter=${filter}`;
    if (year)  url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    return axiosClient.get(url);
  },

  /**
   * Lấy dữ liệu biểu đồ tăng trưởng điểm danh theo thời gian
   */
  getChartData(filter, year, month) {
    let url = `/thong-ke/chart?filter=${filter}`;
    if (year)  url += `&year=${year}`;
    if (month) url += `&month=${month}`;
    return axiosClient.get(url);
  },

  /**
   * BỔ SUNG: Lấy danh sách tất cả học kỳ và học kỳ mặc định
   */
  getSemesters() {
    return axiosClient.get('/thong-ke/hoc-ky');
  },

  /**
   * Lấy tỷ lệ điểm danh của tất cả các lớp trong một học kỳ (vẽ biểu đồ cột)
   */
  getOverallAttendance(hocky_id, bomon_id) {
    let url = `/thong-ke/ti-le-lop-hoc`;
    const query = new URLSearchParams();
    if (hocky_id) query.set('hocky_id', hocky_id);
    if (bomon_id && bomon_id !== 'all') query.set('bomon_id', bomon_id);
    const suffix = query.toString();
    if (suffix) url += `?${suffix}`;
    return axiosClient.get(url);
  },

  /**
   * Lấy chi tiết ma trận điểm danh của từng sinh viên trong 1 lớp học phần
   */
  getClassDetailAttendance(lophocphan_id) {
    return axiosClient.get(`/thong-ke/chi-tiet-lop/${lophocphan_id}`);
  },

  /**
   * Thống kê điểm danh theo ngày (có bộ lọc bộ môn, học kỳ)
   */
  getDailyAttendanceReport(params = {}) {
    const query = new URLSearchParams();
    if (params.hocky_id) query.set('hocky_id', params.hocky_id);
    if (params.ngay) query.set('ngay', params.ngay);
    if (params.from_ngay) query.set('from_ngay', params.from_ngay);
    if (params.to_ngay) query.set('to_ngay', params.to_ngay);
    if (params.bomon_id && params.bomon_id !== 'all') query.set('bomon_id', params.bomon_id);
    const suffix = query.toString();
    return axiosClient.get(`/thong-ke/diem-danh-theo-ngay${suffix ? `?${suffix}` : ''}`);
  }
};

export default dashboardService;