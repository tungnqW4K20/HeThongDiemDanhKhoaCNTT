import axiosClient from './axiosClient';

const khoaService = {
  getAll: () => {
    return axiosClient.get('/khoa/get-all-khoa');
  },

  getAllBoMon: () => {
    return axiosClient.get('/khoa/get-all-bo-mon');
  },

  getTruongBoMonOptions: (khoaId) => {
    const query = khoaId ? `?khoa_id=${khoaId}` : '';
    return axiosClient.get(`/khoa/get-truong-bo-mon-options${query}`);
  },
  
  create: (data) => {
    return axiosClient.post('/khoa/create-khoa', data);
  },
  
  update: (data) => {
    return axiosClient.put('/khoa/update-khoa', data);
  },
  
  delete: (id) => {
    return axiosClient.delete('/khoa/delete-khoa', { data: { id } });
  },

  createBoMon: (data) => {
    return axiosClient.post('/khoa/create-bo-mon', data);
  },

  updateBoMon: (data) => {
    return axiosClient.put('/khoa/update-bo-mon', data);
  },

  deleteBoMon: (id) => {
    return axiosClient.delete('/khoa/delete-bo-mon', { data: { id } });
  }
};

export default khoaService;