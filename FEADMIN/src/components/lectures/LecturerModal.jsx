import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Edit2, Plus, Mail, Phone, Briefcase } from 'lucide-react';

// Nhận prop faculties từ component cha (LecturerManagerPage)
const LecturerModal = ({ isOpen, onClose, onSave, initialData, faculties = [] }) => {
  const [formData, setFormData] = useState({
    ma_gv: '',
    khoa_id: '', // Đổi từ 'khoa' thành 'khoa_id' để khớp với DB
    ho: '',
    ten: '',
    email: '',
    sdt: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Logic mapping dữ liệu khi Sửa
        setFormData({
            ma_gv: initialData.ma_gv || '',
            // Kiểm tra: nếu có khoa_id trực tiếp hoặc nằm trong object Khoa
            khoa_id: initialData.khoa_id || initialData.Khoa?.khoa_id || '', 
            ho: initialData.ho || '',
            ten: initialData.ten || '',
            email: initialData.email || '',
            sdt: initialData.sdt || ''
        });
      } else {
        // Reset form khi Tạo mới
        setFormData({ 
            ma_gv: '', 
            khoa_id: '', 
            ho: '', 
            ten: '', 
            email: '', 
            sdt: '' 
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Validate Form
  const validate = () => {
    const newErrors = {};
    if (!formData.ma_gv.trim()) newErrors.ma_gv = 'Mã GV là bắt buộc';
    if (!formData.khoa_id) newErrors.khoa_id = 'Vui lòng chọn Khoa/Viện'; // Check UUID
    if (!formData.ho.trim()) newErrors.ho = 'Họ đệm là bắt buộc';
    if (!formData.ten.trim()) newErrors.ten = 'Tên là bắt buộc';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) newErrors.email = 'Email là bắt buộc';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Email không hợp lệ';

    // Regex SĐT Việt Nam đơn giản
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (formData.sdt && !phoneRegex.test(formData.sdt)) newErrors.sdt = 'Số điện thoại không hợp lệ';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Gửi dữ liệu ra ngoài, lúc này đã có khoa_id chuẩn
      onSave(formData);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
            {initialData ? <Edit2 size={18}/> : <Plus size={18}/>}
            {initialData ? 'Cập nhật thông tin Giảng viên' : 'Thêm Giảng viên mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          
          {/* Section 1: Định danh & Khoa */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-1">Thông tin cơ bản</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Mã GV */}
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Mã Giảng viên <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={formData.ma_gv}
                        onChange={(e) => setFormData({...formData, ma_gv: e.target.value})}
                        disabled={!!initialData} // Không cho sửa mã GV khi update
                        placeholder="VD: GV001"
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm font-mono font-medium
                            ${errors.ma_gv ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}
                            ${initialData ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                    {errors.ma_gv && <p className="text-red-500 text-xs mt-1">{errors.ma_gv}</p>}
                </div>

                {/* Dropdown Khoa (Dynamic Data) */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Khoa / Viện <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select 
                            value={formData.khoa_id}
                            onChange={(e) => setFormData({...formData, khoa_id: e.target.value})}
                            className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm bg-white appearance-none
                                ${errors.khoa_id ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                        >
                            <option value="">-- Chọn Khoa quản lý --</option>
                            {/* Map dữ liệu từ API */}
                            {faculties.map((khoa) => (
                                <option key={khoa.khoa_id} value={khoa.khoa_id}>
                                    {khoa.ten_khoa}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    {errors.khoa_id && <p className="text-red-500 text-xs mt-1">{errors.khoa_id}</p>}
                </div>
            </div>

            {/* Hàng 2: Họ và Tên */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Họ đệm <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={formData.ho}
                        onChange={(e) => setFormData({...formData, ho: e.target.value})}
                        placeholder="Nguyễn Văn"
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                            ${errors.ho ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                    />
                        {errors.ho && <p className="text-red-500 text-xs mt-1">{errors.ho}</p>}
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Tên <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={formData.ten}
                        onChange={(e) => setFormData({...formData, ten: e.target.value})}
                        placeholder="An"
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                            ${errors.ten ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                    />
                    {errors.ten && <p className="text-red-500 text-xs mt-1">{errors.ten}</p>}
                </div>
            </div>
          </div>

          {/* Section 2: Liên hệ */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-1">Thông tin liên hệ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="example@university.edu.vn"
                            className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                                ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                        />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Số điện thoại</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            value={formData.sdt}
                            onChange={(e) => setFormData({...formData, sdt: e.target.value})}
                            placeholder="0987..."
                            className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                                ${errors.sdt ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                        />
                    </div>
                    {errors.sdt && <p className="text-red-500 text-xs mt-1">{errors.sdt}</p>}
                </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors text-sm"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleSubmit}
              className="px-5 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-sm flex items-center gap-2 text-sm"
            >
              <Save size={16} /> {initialData ? 'Lưu thay đổi' : 'Tạo mới'}
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LecturerModal;