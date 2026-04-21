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
  },

  getStudentsByAdminClass(lophocphan_id, lop_hanhchinh_id) {
    return axiosClient.get(`/lop-hoc-phan/${lophocphan_id}/lop-hanh-chinh/${lop_hanhchinh_id}/sinh-vien`);
  },

  addStudentsFromAdminClass(lophocphan_id, payload) {
    return axiosClient.post(`/lop-hoc-phan/${lophocphan_id}/lop-hanh-chinh/add-sinh-vien`, payload);
  },

  removeStudentFromClass(lophocphan_id, sinhvien_id) {
    return axiosClient.delete(`/lop-hoc-phan/${lophocphan_id}/sinh-vien/${sinhvien_id}`);
  }
}


export default hocPhanService;