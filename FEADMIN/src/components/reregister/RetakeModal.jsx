import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';

const RetakeModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    credits: 0,
    semester: 'HK1_2024',
    maxCapacity: 60,
    tuitionFee: 0,
    deadline: '',
    status: 'open'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset form khi tạo mới
      setFormData({
        subjectName: '',
        subjectCode: '',
        credits: 3,
        semester: 'HK1_2024',
        maxCapacity: 60,
        tuitionFee: 950000,
        deadline: '',
        status: 'open'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
        {/* Header Modal */}
        <div className="bg-[#3B5998] px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">
            {initialData ? 'Cập nhật lớp học lại' : 'Mở lớp học lại mới'}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded transition">
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select 
              name="subjectName" 
              value={formData.subjectName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
            >
              <option value="">-- Chọn môn học --</option>
              <option value="Lập trình Web nâng cao">Lập trình Web nâng cao (INT302)</option>
              <option value="Cấu trúc dữ liệu">Cấu trúc dữ liệu (INT201)</option>
              <option value="Toán rời rạc">Toán rời rạc (MAT101)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã lớp/Học phần</label>
            <input 
              type="text" 
              name="subjectCode"
              value={formData.subjectCode}
              onChange={handleChange}
              placeholder="VD: HL_INT302_01"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#3B5998]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ áp dụng</label>
            <select 
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#3B5998]"
            >
              <option value="HK1_2024">Học kỳ 1 - 2024</option>
              <option value="HK2_2024">Học kỳ 2 - 2024</option>
              <option value="HK_HE_2024">Học kỳ Hè - 2024</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tối đa</label>
            <input 
              type="number" 
              name="maxCapacity"
              value={formData.maxCapacity}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#3B5998]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hạn đăng ký</label>
            <input 
              type="date" 
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#3B5998]"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
             <div className="flex gap-4 mt-2">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="status" value="open" checked={formData.status === 'open'} onChange={handleChange} className="text-[#3B5998] focus:ring-[#3B5998]"/>
                  <span className="ml-2 text-sm">Đang mở</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="status" value="closed" checked={formData.status === 'closed'} onChange={handleChange} className="text-[#3B5998] focus:ring-[#3B5998]"/>
                  <span className="ml-2 text-sm">Đã khóa</span>
                </label>
             </div>
          </div>

          <div className="col-span-2 border-t pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-[#3B5998] text-white rounded flex items-center gap-2 hover:bg-[#2d4373] transition shadow-md"
            >
              <Save size={18} />
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RetakeModal;