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
    }
};

export default taiKhoanService;
