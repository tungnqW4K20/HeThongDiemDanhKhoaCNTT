import React, { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';

const AddStudentModal = ({ isOpen, onClose, onSave, classId }) => {
  const initialFormState = {
    ma_sv: '',
    ten: '',
    email: '',
    sdt: '',
    ngaysinh: '',
    lop_hanhchinh_id: classId || ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...initialFormState, lop_hanhchinh_id: classId });
    }
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.ma_sv || !formData.ten) {
      alert("Vui lòng nhập Mã SV và Họ tên");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Thêm sinh viên mới</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mã SV <span className="text-red-500">*</span></label>
                <input 
                  type="text" name="ma_sv" value={formData.ma_sv} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
                  required
                />
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ngày sinh</label>
                <input 
                  type="date" name="ngaysinh" value={formData.ngaysinh} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
                />
             </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Họ và tên <span className="text-red-500">*</span></label>
            <input 
              type="text" name="ten" value={formData.ten} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Số điện thoại</label>
              <input 
                type="text" name="sdt" value={formData.sdt} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm">Hủy bỏ</button>
            <button type="submit" className="px-4 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
              <Plus size={16} /> Thêm sinh viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;