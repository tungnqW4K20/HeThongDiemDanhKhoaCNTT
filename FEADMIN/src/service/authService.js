import axiosClient from './axiosClient'; 
const loginAdmin = (username, password) => {
    return axiosClient.post('/auth/login-admin', { username, password });
};

const createLecturerAccount = (data) => {
    // data: { username, password, ma_gv }
    return axiosClient.post('/auth/admin/tao-tk-gv', data);
};

const updateLecturerAccount = (taikhoan_id, data) => {
    // data: { username?, new_password? }
    return axiosClient.put(`/auth/admin/tk-gv/${taikhoan_id}`, data);
};

const changePassword = (data) => {
    // data: { current_password, new_password }
    return axiosClient.put('/auth/change-password', data);
};

export default {
    loginAdmin,
    createLecturerAccount,
    updateLecturerAccount,
    changePassword
};
