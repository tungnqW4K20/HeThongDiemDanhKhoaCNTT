import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Edit2, Plus, ChevronDown, Check, Search } from 'lucide-react';
import khoaService from '../../service/khoaService';

const SubjectModal = ({ isOpen, onClose, onSave, initialData }) => {
  // State form data
  const [formData, setFormData] = useState({
    ma_mon: '',
    ten_mon: '',
    sotinchi: 3,
    mota: '',
    khoa_id: '',
    bomon_id: ''
  });

  // State danh sách khoa từ API
  const [departments, setDepartments] = useState([]);
  const [boMons, setBoMons] = useState([]);

  // State riêng cho việc tìm kiếm/hiển thị trong dropdown
  const [searchDepartmentTerm, setSearchDepartmentTerm] = useState('');
  const [searchBoMonTerm, setSearchBoMonTerm] = useState('');
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [isBoMonDropdownOpen, setIsBoMonDropdownOpen] = useState(false);
  
  const [errors, setErrors] = useState({});
  const departmentDropdownRef = useRef(null);
  const boMonDropdownRef = useRef(null);

  // Load danh sách Khoa khi Modal mount
  useEffect(() => {
    if (isOpen) {
      const fetchOptions = async () => {
        try {
          const [khoaRes, boMonRes] = await Promise.all([
            khoaService.getAll(),
            khoaService.getAllBoMon()
          ]);

          if (khoaRes && khoaRes.data) {
            setDepartments(khoaRes.data);
          }
          if (boMonRes && boMonRes.data) {
            setBoMons(boMonRes.data);
          }
        } catch (error) {
          console.error('Lỗi lấy dữ liệu khoa/bộ môn:', error);
        }
      };
      fetchOptions();
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
            khoa_id: initialData.khoa_id || '',
            bomon_id: initialData.bo_mon_id || initialData.bomon_id || initialData.chuyennganh_id || ''
        });
        
        // Đồng bộ tên hiển thị cho dropdown khoa
        if (initialData.ten_khoa) {
             setSearchDepartmentTerm(initialData.ten_khoa);
        } else {
             const found = departments.find(d => d.khoa_id === initialData.khoa_id);
             setSearchDepartmentTerm(found ? found.ten_khoa : '');
        }

        // Đồng bộ tên hiển thị cho dropdown bộ môn
        if (initialData.ten_bo_mon) {
          setSearchBoMonTerm(initialData.ten_bo_mon);
        } else {
          const foundBoMon = boMons.find((bm) => {
            const boMonId = bm.bomon_id || bm.chuyennganh_id;
            return boMonId === (initialData.bo_mon_id || initialData.bomon_id || initialData.chuyennganh_id);
          });
          setSearchBoMonTerm(foundBoMon ? (foundBoMon.ten_bomon || foundBoMon.ten_chuyennganh) : '');
        }

      } else {
        setFormData({ ma_mon: '', ten_mon: '', sotinchi: 3, mota: '', khoa_id: '', bomon_id: '' });
        setSearchDepartmentTerm('');
        setSearchBoMonTerm('');
      }
      setErrors({});
      setIsDepartmentDropdownOpen(false);
      setIsBoMonDropdownOpen(false);
    }
  }, [isOpen, initialData, departments, boMons]);

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
        setIsDepartmentDropdownOpen(false);
        if (searchDepartmentTerm === '') {
          setFormData(prev => ({ ...prev, khoa_id: '', bomon_id: '' }));
        }
      }

      if (boMonDropdownRef.current && !boMonDropdownRef.current.contains(event.target)) {
        setIsBoMonDropdownOpen(false);
        if (searchBoMonTerm === '') {
          setFormData(prev => ({ ...prev, bomon_id: '' }));
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchDepartmentTerm, searchBoMonTerm]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Lọc danh sách khoa dựa trên từ khóa tìm kiếm
  const filteredDepartments = departments.filter(dept => 
    dept.ten_khoa.toLowerCase().includes(searchDepartmentTerm.toLowerCase()) || 
    dept.ma_khoa.toLowerCase().includes(searchDepartmentTerm.toLowerCase())
  );

  const filteredBoMons = boMons
    .filter((bm) => !formData.khoa_id || bm.khoa_id === formData.khoa_id)
    .filter((bm) => {
      const name = bm.ten_bomon || bm.ten_chuyennganh || '';
      const code = bm.ma_bomon || bm.ma_chuyennganh || '';
      const term = searchBoMonTerm.toLowerCase();
      return name.toLowerCase().includes(term) || code.toLowerCase().includes(term);
    });

  const validate = () => {
    const newErrors = {};
    if (!formData.ma_mon.trim()) newErrors.ma_mon = 'Mã môn không được để trống';
    if (!formData.ten_mon.trim()) newErrors.ten_mon = 'Tên môn không được để trống';
    if (!formData.khoa_id) newErrors.khoa_id = 'Vui lòng chọn khoa';
    if (!formData.bomon_id) newErrors.bomon_id = 'Vui lòng chọn bộ môn';
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
    const nextBoMon = boMons.find((bm) => {
      const boMonId = bm.bomon_id || bm.chuyennganh_id;
      return boMonId === formData.bomon_id;
    });

    setFormData((prev) => ({
      ...prev,
      khoa_id: dept.khoa_id,
      // Nếu bộ môn đã chọn không thuộc khoa mới thì reset để tránh lưu sai quan hệ
      bomon_id: nextBoMon && nextBoMon.khoa_id === dept.khoa_id ? prev.bomon_id : ''
    }));

    setSearchDepartmentTerm(dept.ten_khoa);
    if (!nextBoMon || nextBoMon.khoa_id !== dept.khoa_id) {
      setSearchBoMonTerm('');
    }
    setIsDepartmentDropdownOpen(false);
    setErrors((prev) => ({ ...prev, khoa_id: '', bomon_id: '' }));
  };

  const handleDepartmentSearchChange = (e) => {
    const value = e.target.value;
    setSearchDepartmentTerm(value);
    setIsDepartmentDropdownOpen(true);
    if (value === '') {
      setFormData(prev => ({ ...prev, khoa_id: '', bomon_id: '' }));
      setSearchBoMonTerm('');
    }
  };

  const handleSelectBoMon = (bm) => {
    const boMonId = bm.bomon_id || bm.chuyennganh_id;
    const boMonName = bm.ten_bomon || bm.ten_chuyennganh || '';

    setFormData((prev) => ({
      ...prev,
      bomon_id: boMonId,
      // Đồng bộ khoa theo bộ môn để payload luôn hợp lệ
      khoa_id: bm.khoa_id || prev.khoa_id
    }));

    if (bm.khoa_id) {
      const khoa = departments.find((dept) => dept.khoa_id === bm.khoa_id);
      if (khoa) {
        setSearchDepartmentTerm(khoa.ten_khoa);
      }
    }

    setSearchBoMonTerm(boMonName);
    setIsBoMonDropdownOpen(false);
    setErrors((prev) => ({ ...prev, bomon_id: '', khoa_id: '' }));
  };

  const handleBoMonSearchChange = (e) => {
    const value = e.target.value;
    setSearchBoMonTerm(value);
    setIsBoMonDropdownOpen(true);
    if (value === '') {
      setFormData((prev) => ({ ...prev, bomon_id: '' }));
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
            <div className="relative" ref={departmentDropdownRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Khoa quản lý <span className="text-red-500">*</span></label>
            <div className="relative">
                <input
                    type="text"
                value={searchDepartmentTerm}
                onChange={handleDepartmentSearchChange}
                onFocus={() => setIsDepartmentDropdownOpen(true)}
                    placeholder="Chọn hoặc tìm kiếm khoa..."
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm font-medium pr-10
                        ${errors.khoa_id ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                {isDepartmentDropdownOpen ? <Search size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>
            {errors.khoa_id && <p className="text-red-500 text-xs mt-1">{errors.khoa_id}</p>}

            {/* Dropdown List */}
            {isDepartmentDropdownOpen && (
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

              <div className="relative" ref={boMonDropdownRef}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bộ môn <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={searchBoMonTerm}
                  onChange={handleBoMonSearchChange}
                  onFocus={() => setIsBoMonDropdownOpen(true)}
                  placeholder={formData.khoa_id ? 'Chọn hoặc tìm kiếm bộ môn...' : 'Vui lòng chọn khoa trước'}
                  disabled={!formData.khoa_id}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm font-medium pr-10
                    ${errors.bomon_id ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}
                    ${!formData.khoa_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  {isBoMonDropdownOpen ? <Search size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {errors.bomon_id && <p className="text-red-500 text-xs mt-1">{errors.bomon_id}</p>}

              {isBoMonDropdownOpen && formData.khoa_id && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredBoMons.length > 0 ? (
                    filteredBoMons.map((bm) => {
                      const boMonId = bm.bomon_id || bm.chuyennganh_id;
                      const boMonName = bm.ten_bomon || bm.ten_chuyennganh || 'Không tên';
                      const boMonCode = bm.ma_bomon || bm.ma_chuyennganh || '';
                      return (
                      <div 
                        key={boMonId}
                        onClick={() => handleSelectBoMon(bm)}
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between group transition-colors
                          ${formData.bomon_id === boMonId ? 'bg-[#3B5998]/5 text-[#3B5998] font-medium' : 'text-gray-700'}`}
                      >
                        <span>{boMonName} {boMonCode ? `(${boMonCode})` : ''}</span>
                        {formData.bomon_id === boMonId && <Check size={14} className="text-[#3B5998]"/>}
                      </div>
                      );
                    })
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
    </div>,
    document.body
  );
};



export default SubjectModal;