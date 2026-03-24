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
  getOverallAttendance(hocky_id) {
    let url = `/thong-ke/ti-le-lop-hoc`;
    // Nếu có hocky_id thì gửi lên dưới dạng query string
    if (hocky_id) url += `?hocky_id=${hocky_id}`;
    return axiosClient.get(url);
  },

  /**
   * Lấy chi tiết ma trận điểm danh của từng sinh viên trong 1 lớp học phần
   */
  getClassDetailAttendance(lophocphan_id) {
    return axiosClient.get(`/thong-ke/chi-tiet-lop/${lophocphan_id}`);
  }
};

export default dashboardService;