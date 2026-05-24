import axiosClient from './axiosClient';

const monHocService = {
  getAll() {
    return axiosClient.get('/mon-hoc');
  },
  getById(id) {
    return axiosClient.get(`/mon-hoc/${id}`);
  },

  create(data) {
    return axiosClient.post('/mon-hoc', data);
  },

  update(id, data) {
    return axiosClient.put(`/mon-hoc/${id}`, data);
  },

  delete(id) {
    return axiosClient.delete(`/mon-hoc/${id}`);
  },
  
  importExcel(formData) {
    return axiosClient.post('/mon-hoc/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  bulkAssignKhoa(khoaId, monHocIds) {
    return axiosClient.put('/mon-hoc/bulk/assign-khoa', {
      khoa_id: khoaId,
      monhoc_ids: monHocIds
    });
  }
};

export default monHocService;

