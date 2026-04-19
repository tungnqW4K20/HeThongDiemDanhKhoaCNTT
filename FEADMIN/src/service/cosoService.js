import axiosClient from './axiosClient';

const cosoService = {
  getAll() {
    return axiosClient.get('/co-so/all');
  },

  create(data) {
    return axiosClient.post('/co-so/create', data);
  },

  update(data) {
    return axiosClient.put('/co-so/update', data);
  },

  delete(id) {
    return axiosClient.delete('/co-so/delete', { data: { id } });
  }
};

export default cosoService;
