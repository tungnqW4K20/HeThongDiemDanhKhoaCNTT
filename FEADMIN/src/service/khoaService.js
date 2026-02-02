import axiosClient from './axiosClient';

const khoaService = {
  getAll: () => {
    return axiosClient.get('/khoa/get-all-khoa');
  },
  
  create: (data) => {
    return axiosClient.post('/khoa/create-khoa', data);
  },
  
  update: (data) => {
    return axiosClient.put('/khoa/update-khoa', data);
  },
  
  delete: (id) => {
    return axiosClient.delete('/khoa/delete-khoa', { data: { id } });
  }
};

export default khoaService;