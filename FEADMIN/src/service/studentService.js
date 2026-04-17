import axiosClient from './axiosClient';

const studentService = {
  getByClass(classId) {
    return axiosClient.get(`/sinh-vien/lop/${classId}`);
  },

  create(data) {
    return axiosClient.post('/sinh-vien', data);
  },

  update(studentId, data) {
    return axiosClient.put(`/sinh-vien/${studentId}`, data);
  },

  delete(studentId) {
    return axiosClient.delete(`/sinh-vien/${studentId}`);
  },

  // importExcel(file, classId) {
  //   console.log("🚀 Service: Đang gọi API import...", { file, classId }); 

  //   const formData = new FormData();
  //   formData.append('file', file);
  //   formData.append('lop_hanhchinh_id', classId);

  //   return axiosClient.post('/sinh-vien/import', formData);
  // }
  importExcel: (file, classId) => {
        const formData = new FormData();
        
        // 1. Đưa file vào FormData (tên key 'file' phải khớp với backend)
        formData.append('file', file);
        
        // 2. Đưa ID lớp vào (tên key 'lop_hanhchinh_id' dựa theo curl bạn gửi trước đó)
        formData.append('lop_hanhchinh_id', classId);

        // 3. Gửi Request POST
        return axiosClient.post('/sinh-vien/import', formData, {
            headers: {
                // Quan trọng: Ghi đè Content-Type để gửi dạng file thay vì JSON
                'Content-Type': 'multipart/form-data',
            },
        });
    },

};

export default studentService;