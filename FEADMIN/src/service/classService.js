import axiosClient from './axiosClient';

const classService = {
  getAll(params) {
    return axiosClient.get('/lop', { params });
  },

  create(data) {
    return axiosClient.post('/lop', data);
  },

  update(classId, data) {
    return axiosClient.put(`/lop/${classId}`, data);
  },

  createMultiple(classesArray) {
    const promises = classesArray.map(cls => this.create(cls));
    return Promise.allSettled(promises);
  },

  importExcel(file) {
    const formData = new FormData();
    formData.append('file', file); 
    return axiosClient.post('/lop/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

};

export default classService;