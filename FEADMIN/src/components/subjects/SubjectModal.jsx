import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit2, Plus, ChevronDown, Check, Search } from 'lucide-react';
import khoaService from '../../service/khoaService';

const SubjectModal = ({ isOpen, onClose, onSave, initialData }) => {
  // State form data
  const [formData, setFormData] = useState({
    ma_mon: '',
    ten_mon: '',
    sotinchi: 3,
    mota: '',
    khoa_id: '' // API yêu cầu khoa_id
  });

  // State danh sách khoa từ API
  const [departments, setDepartments] = useState([]);

  // State riêng cho việc tìm kiếm/hiển thị trong dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);

  // Load danh sách Khoa khi Modal mount
  useEffect(() => {
    if (isOpen) {
      const fetchKhoa = async () => {
        try {
          const res = await khoaService.getAll();
          if (res && res.data) {
            setDepartments(res.data);
          }
        } catch (error) {
          console.error("Lỗi lấy danh sách khoa:", error);
        }
      };
      fetchKhoa();
    }
  }, [isOpen]);

  // Reset form hoặc load data edit khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
            ma_mon: initialData.ma_mon,
            ten_mon: initialData.ten_mon,
            sotinchi: initialData.sotinchi,
            mota: initialData.mota || '',
            khoa_id: initialData.khoa_id // Lấy khoa_id từ dữ liệu
        });
        
        // Hiển thị tên khoa lên input search nếu đã có
        // Lưu ý: initialData đã được làm phẳng ở SubjectManagerPage, có thể có ten_khoa
        if (initialData.ten_khoa) {
             setSearchTerm(initialData.ten_khoa);
        } else {
             // Fallback: tìm trong list departments nếu list đã load xong (ít xảy ra do async)
             const found = departments.find(d => d.khoa_id === initialData.khoa_id);
             setSearchTerm(found ? found.ten_khoa : '');
        }

      } else {
        setFormData({ ma_mon: '', ten_mon: '', sotinchi: 3, mota: '', khoa_id: '' });
        setSearchTerm('');
      }
      setErrors({});
      setIsDropdownOpen(false);
    }
  }, [isOpen, initialData, departments]); // Thêm dependencies để sync khi load xong

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        if (searchTerm === '') {
            setFormData(prev => ({ ...prev, khoa_id: '' }));
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm]);

  if (!isOpen) return null;

  // Lọc danh sách khoa dựa trên từ khóa tìm kiếm
  const filteredDepartments = departments.filter(dept => 
    dept.ten_khoa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    dept.ma_khoa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validate = () => {
    const newErrors = {};
    if (!formData.ma_mon.trim()) newErrors.ma_mon = 'Mã môn không được để trống';
    if (!formData.ten_mon.trim()) newErrors.ten_mon = 'Tên môn không được để trống';
    if (!formData.khoa_id) newErrors.khoa_id = 'Vui lòng chọn khoa';
    if (formData.sotinchi < 1 || formData.sotinchi > 10) newErrors.sotinchi = 'Số tín chỉ không hợp lệ (1-10)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleSelectDepartment = (dept) => {
    setFormData({ ...formData, khoa_id: dept.khoa_id });
    setSearchTerm(dept.ten_khoa);
    setIsDropdownOpen(false);
    setErrors({ ...errors, khoa_id: '' });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);
    if (value === '') {
        setFormData(prev => ({ ...prev, khoa_id: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
            {initialData ? <Edit2 size={18}/> : <Plus size={18}/>}
            {initialData ? 'Cập nhật môn học' : 'Thêm môn học mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          {/* SEARCHABLE DROPDOWN - KHOA */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Khoa quản lý <span className="text-red-500">*</span></label>
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Chọn hoặc tìm kiếm khoa..."
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm font-medium pr-10
                        ${errors.khoa_id ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    {isDropdownOpen ? <Search size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>
            {errors.khoa_id && <p className="text-red-500 text-xs mt-1">{errors.khoa_id}</p>}

            {/* Dropdown List */}
            {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredDepartments.length > 0 ? (
                        filteredDepartments.map((dept) => (
                            <div 
                                key={dept.khoa_id}
                                onClick={() => handleSelectDepartment(dept)}
                                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between group transition-colors
                                    ${formData.khoa_id === dept.khoa_id ? 'bg-[#3B5998]/5 text-[#3B5998] font-medium' : 'text-gray-700'}`}
                            >
                                <span>{dept.ten_khoa}</span>
                                {formData.khoa_id === dept.khoa_id && <Check size={14} className="text-[#3B5998]"/>}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                            Không tìm thấy kết quả
                        </div>
                    )}
                </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mã môn học <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input 
                      type="text" 
                      value={formData.ma_mon}
                      onChange={(e) => setFormData({...formData, ma_mon: e.target.value})}
                      placeholder="VD: INT1001"
                      className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm font-medium
                        ${errors.ma_mon ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                    />
                    {errors.ma_mon && <p className="text-red-500 text-xs mt-1">{errors.ma_mon}</p>}
                </div>
            </div>
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Số tín chỉ <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  min="1" max="10"
                  value={formData.sotinchi}
                  onChange={(e) => setFormData({...formData, sotinchi: parseInt(e.target.value) || 0})}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                    ${errors.sotinchi ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                />
                {errors.sotinchi && <p className="text-red-500 text-xs mt-1">{errors.sotinchi}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tên môn học <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={formData.ten_mon}
              onChange={(e) => setFormData({...formData, ten_mon: e.target.value})}
              placeholder="VD: Nhập môn lập trình"
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                ${errors.ten_mon ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
            />
            {errors.ten_mon && <p className="text-red-500 text-xs mt-1">{errors.ten_mon}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mô tả chi tiết</label>
            <textarea 
              rows="4"
              value={formData.mota}
              onChange={(e) => setFormData({...formData, mota: e.target.value})}
              placeholder="Nhập mô tả về nội dung môn học..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] transition-all text-sm resize-none"
            ></textarea>
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
              <Save size={16} /> {initialData ? 'Lưu thay đổi' : 'Thêm mới'}
            </button>
        </div>
      </div>
    </div>
  );
};



export default SubjectModal;