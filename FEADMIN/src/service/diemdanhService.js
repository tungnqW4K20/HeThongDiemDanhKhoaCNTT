import axiosClient from './axiosClient';

const diemdanhService = {
  // GET /diem-danh?lophocphan_id=...&ngay=YYYY-MM-DD
  get(params) {
    return axiosClient.get('/diem-danh', { params });
  },

  // POST /diem-danh  body: { lophocphan_id, ngay, danh_sach: [...] }
  save(payload) {
    return axiosClient.post('/diem-danh', payload);
  }
};

export default diemdanhService;
