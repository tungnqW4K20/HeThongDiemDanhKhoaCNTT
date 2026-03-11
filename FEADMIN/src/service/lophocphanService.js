import axiosClient from './axiosClient';
const hocPhanService = {

  getAll(params) {
    return axiosClient.get('/lop-hoc-phan', { params });
  },

  getStudents(lophocphan_id) {
    return axiosClient.get(`/lop-hoc-phan/${lophocphan_id}/danh-sach-sinh-vien`);
  },

  importExcel(lophocphan_id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/lop-hoc-phan/${lophocphan_id}/import-excel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}


export default hocPhanService;