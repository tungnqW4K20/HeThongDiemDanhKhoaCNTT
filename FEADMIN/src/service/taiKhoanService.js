import axiosClient from './axiosClient';

const taiKhoanService = {
    getAll: () => {
        return axiosClient.get('/tai-khoan');
    },
    create: (data) => {
        return axiosClient.post('/tai-khoan', data);
    },
    update: (id, data) => {
        return axiosClient.put(`/tai-khoan/${id}`, data);
    },
    delete: (id) => {
        return axiosClient.delete(`/tai-khoan/${id}`);
    },
    importExcel: (formData) => {
        return axiosClient.post('/tai-khoan/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};

export default taiKhoanService;
