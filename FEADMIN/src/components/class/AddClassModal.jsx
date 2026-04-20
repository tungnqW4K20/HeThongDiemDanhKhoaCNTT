import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import khoaService from '../../service/khoaService';
import giangVienService from '../../service/giangVienService';
import coSoService from '../../service/cosoService'; // <-- IMPORT MỚI
import SearchableSelect from '../common/SearchableSelect';

// ==========================================
// MAIN COMPONENT: ADD CLASS MODAL
// ==========================================
const AddClassModal = ({ isOpen, onClose, onSave }) => {
  const initialFormState = {
    name: '',       
    department: '', 
    majorId: '',    
    program: '',    
    year: '',       
    teacher: '',
    campusId: '', // <-- TRƯỜNG MỚI: CƠ SỞ    
  };

  const [formData, setFormData] = useState(initialFormState);
  
  // Options
  const [departmentOptions, setDepartmentOptions] = useState([]); 
  const [majorOptions, setMajorOptions] = useState([]); 
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [campusOptions, setCampusOptions] = useState([]); // <-- OPTIONS MỚI

  // Raw Data
  const [rawDepartments, setRawDepartments] = useState([]);

  // Loading States
  const [isLoadingKhoa, setIsLoadingKhoa] = useState(false);
  const [isLoadingGV, setIsLoadingGV] = useState(false);
  const [isInitLoading, setIsInitLoading] = useState(false); // Loading chung lúc mở modal

  // --- 1. Init Data (Gọi API lấy Khoa + Cơ Sở) ---
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
      setTeacherOptions([]);
      setMajorOptions([]);
      setCampusOptions([]);
      initData();
    }
  }, [isOpen]);

  const initData = async () => {
    setIsInitLoading(true);
    setIsLoadingKhoa(true);
    try {
      // Gọi song song API lấy Khoa và API lấy Cơ sở
      const [resKhoa, resCoSo] = await Promise.all([
        khoaService.getAll(),
        coSoService.getAll()
      ]);

      // Xử lý dữ liệu Khoa
      if (resKhoa && resKhoa.errCode === 0) {
        setRawDepartments(resKhoa.data);
        setDepartmentOptions(resKhoa.data.map(d => ({
          value: d.khoa_id,
          label: d.ten_khoa
        })));
      }

      // Xử lý dữ liệu Cơ sở
      if (resCoSo && resCoSo.errCode === 0) {
        setCampusOptions(resCoSo.data.map(cs => ({
          value: cs.coso_id,
          label: cs.ten_coso
        })));
      }

    } catch (error) {
      console.error("Lỗi khởi tạo dữ liệu:", error);
    } finally {
      setIsInitLoading(false);
      setIsLoadingKhoa(false);
    }
  };

  // --- 2. Handle Logic ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Logic chọn Khoa -> Lọc Chuyên ngành
  const handleSelectDepartment = (khoaId) => {
    setFormData(prev => ({ 
      ...prev, 
      department: khoaId, 
      teacher: '', 
      majorId: '' 
    }));

    if (khoaId) {
      const selectedKhoa = rawDepartments.find(d => d.khoa_id === khoaId);
      if (selectedKhoa) {
        fetchTeachers(selectedKhoa.ma_khoa);
        
        // Lấy chuyên ngành từ nested object
        const listChuyenNganh = selectedKhoa.DanhSachChuyenNganh || [];
        setMajorOptions(listChuyenNganh.map(m => ({
          value: m.chuyennganh_id,
          label: m.ten_chuyennganh
        })));
      }
    } else {
      setTeacherOptions([]); 
      setMajorOptions([]);
    }
  };

  const fetchTeachers = async (maKhoa) => {
    setIsLoadingGV(true);
    try {
      const res = await giangVienService.getByKhoa(maKhoa);
      if (res && res.errCode === 0) {
        setTeacherOptions(res.data.map(t => ({
          value: t.giangvien_id,
          label: `${t.ho} ${t.ten} (${t.ma_gv})`
        })));
      } else {
        setTeacherOptions([]);
      }
    } catch (error) {
      console.error("Lỗi GV:", error);
      setTeacherOptions([]);
    } finally {
      setIsLoadingGV(false);
    }
  };

  // --- 3. Submit ---
  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate thêm campusId
    if (!formData.name || !formData.department || !formData.year || !formData.campusId) {
      alert("Vui lòng điền đầy đủ các trường bắt buộc (Tên lớp, Niên khóa, Cơ sở, Khoa)!");
      return;
    }

    const payload = {
      ten_lop: formData.name,
      nien_khoa: Number(formData.year),
      chuong_trinh: formData.program || "Đại học", 
      khoa_id: formData.department,
      giangvien_id: formData.teacher || null,
      chuyennganh_id: formData.majorId || null,
      coso_id: formData.campusId, // <-- Gửi coso_id lên server
      ghichu: "Được tạo từ hệ thống"
    };

    onSave(payload);
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Thêm lớp học mới</h3>
            <p className="text-xs text-gray-500 mt-1">Nhập thông tin chi tiết cho lớp hành chính</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all">
            <X size={20} />
          </button>
        </div>
        
        {/* BODY - SCROLLABLE */}
        <div className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Hàng 1: Tên & Niên khóa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tên lớp <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="name" 
                placeholder="VD: DCT1221"
                value={formData.name} 
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm transition-all"
                autoFocus
              />
            </div>
             <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Niên khóa <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                name="year" 
                placeholder="VD: 2024"
                value={formData.year} 
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm transition-all"
              />
            </div>
          </div>

          {/* Hàng 2 (MỚI): Chọn Cơ Sở */}
           <SearchableSelect
            label="Cơ sở đào tạo"
            required={true}
            placeholder="Chọn cơ sở (Mỹ Hào, Hải Dương...)"
            options={campusOptions}
            value={formData.campusId}
            onChange={(val) => setFormData(prev => ({...prev, campusId: val}))}
            isLoading={isInitLoading}
          />
          
          {/* Hàng 3: Khoa */}
          <SearchableSelect
            label="Khoa / Viện"
            required={true}
            placeholder="Tìm kiếm khoa..."
            options={departmentOptions}
            value={formData.department}
            onChange={handleSelectDepartment}
            isLoading={isLoadingKhoa}
          />

          {/* Hàng 4: Chuyên ngành & Hệ */}
          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              label="Chuyên ngành"
              placeholder={formData.department ? "Tìm chuyên ngành..." : "Chọn khoa trước"}
              options={majorOptions}
              value={formData.majorId}
              onChange={(val) => setFormData(prev => ({...prev, majorId: val}))}
              disabled={!formData.department}
            />

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hệ đào tạo</label>
              <input 
                type="text" 
                name="program" 
                placeholder="VD: Đại học"
                value={formData.program} 
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm transition-all"
              />
            </div>
          </div>

          {/* Hàng 5: Giảng viên */}
          <SearchableSelect
            label="Giảng viên CN"
            placeholder={formData.department ? "Tìm giảng viên..." : "Chọn khoa trước"}
            options={teacherOptions}
            value={formData.teacher}
            onChange={(val) => setFormData(prev => ({...prev, teacher: val}))}
            isLoading={isLoadingGV}
            disabled={!formData.department}
          />
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm shadow-sm"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" // Đổi thành submit để form handle enter key tốt hơn (nếu bọc thẻ form)
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-md flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Thêm mới
            </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default AddClassModal;