import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';

const EditStudentModal = ({ isOpen, onClose, onSave, student }) => {
  // Khởi tạo state dựa trên props student truyền vào (mapping dữ liệu API sang form)
  const [formData, setFormData] = useState({
    ma_sv: '',
    ten: '',
    email: '',
    sdt: '',
    ngaysinh: '',
    trang_thai: ''
  });

  useEffect(() => {
    if (student) {
        // Format ngày sinh từ ISO 8601 (nếu có) sang YYYY-MM-DD cho input type="date"
        let formattedDate = '';
        if (student.ngaysinh) {
            formattedDate = new Date(student.ngaysinh).toISOString().split('T')[0];
        }

        setFormData({
            ma_sv: student.ma_sv || '',
            ten: student.ten || '',
            email: student.email || '',
            sdt: student.sdt || '',
            ngaysinh: formattedDate,
            trang_thai: student.trang_thai || 'Đang học'
        });
    }
  }, [student]);

  if (!isOpen || !student) return null;
  if (typeof document === 'undefined') return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Truyền lại cả ID và data form
    onSave({
        ...formData,
        sinhvien_id: student.sinhvien_id, // Giữ lại ID để gọi API PUT
        lop_hanhchinh_id: student.lop_hanhchinh_id // Giữ lại ID lớp
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Chỉnh sửa thông tin</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mã SV</label>
              <input type="text" name="ma_sv" value={formData.ma_sv} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ngày sinh</label>
              <input type="date" name="ngaysinh" value={formData.ngaysinh} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Họ và tên</label>
            <input type="text" name="ten" value={formData.ten} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Số điện thoại</label>
              <input type="text" name="sdt" value={formData.sdt} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Trạng thái</label>
            <select name="trang_thai" value={formData.trang_thai} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm bg-white">
              <option value="Đang học">Đang học</option>
              <option value="Cảnh báo">Cảnh báo</option>
              <option value="Bảo lưu">Bảo lưu</option>
              <option value="Thôi học">Thôi học</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm">Hủy bỏ</button>
            <button type="submit" className="px-4 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
              <Save size={16} /> Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditStudentModal;