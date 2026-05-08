import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Edit2, Plus, Clock, MapPin, Calendar, BookOpen, User, Layers, Hash, Search, ChevronDown, Check, Trash2, Lock } from 'lucide-react'; // Thêm icon Lock
import giangVienService from '../../service/giangVienService';
import hocKyService from '../../service/hockyService';
import monHocService from '../../service/monhocService';
import classService from '../../service/classService';

const InputGroup = ({ label, icon: Icon, error, children, required }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#3B5998] transition-colors">
          <Icon size={16} />
        </div>
      )}
      {children}
    </div>
    {error && <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">⚠ {error}</p>}
  </div>
);

// Giờ bắt đầu của từng tiết: tiết 1 = 07:00, tiết 1–4 = 07:00–11:00
const TIET_START = {
  1: '07:15', 2: '08:10', 3: '09:05', 4: '10:00', 5: '11:00',
  6: '12:30', 7: '13:30', 8: '14:30', 9: '15:30', 10: '16:30',
  11: '17:30',
};

const tietToGio = (tietBD, soTiet) => ({
  gio_batdau: TIET_START[tietBD] || '',
  gio_ketthuc: TIET_START[tietBD + soTiet] || '',
});

const AssignmentModal = ({ isOpen, onClose, onSave, initialData }) => {
  // --- STATE DỮ LIỆU ---
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]); 

  // --- STATE UI ---
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const subjectDropdownRef = useRef(null); 

  const [showLecturerDropdown, setShowLecturerDropdown] = useState(false);
  const [lecturerSearch, setLecturerSearch] = useState('');
  const lecturerDropdownRef = useRef(null);

  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const classDropdownRef = useRef(null);

  // --- FORM DATA ---
  const [formData, setFormData] = useState({
    hocky_id: '',
    monhoc_id: '',
    giangvien_id: '',
    lop_hanhchinh_ids: [],
    thu: 'Mon',
    tiet_bat_dau: 1,
    so_tiet: 4,
    gio_batdau: '07:00',
    gio_ketthuc: '11:00',
    phong: '',
    ngay_batdau: '',
    so_tuan: 15
  });

  const [errors, setErrors] = useState({});

  // 1. Fetch Data Init
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [semesterRes, subjectRes, classRes] = await Promise.all([
          hocKyService.getAll(),
          monHocService.getAll(),
          classService.getAll()
        ]);

        if (semesterRes && semesterRes.success) setSemesters(semesterRes.data);
        if (subjectRes && subjectRes.success) setSubjects(subjectRes.data);
        if (classRes && classRes.success) {
           const listLop = classRes.data?.data || [];
           setClasses(listLop);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  // 2. Load giảng viên theo khoa (với fallback khi GV không cùng khoa)
  useEffect(() => {
    const fetchLecturersByFaculty = async () => {
        const selectedSubject = subjects.find(s => s.monhoc_id === formData.monhoc_id);
        let list = [];

        const normalizeLecturerList = (res) => {
          if (Array.isArray(res?.data)) return res.data;
          if (Array.isArray(res)) return res;
          return [];
        };

        if (selectedSubject && selectedSubject.Khoa) {
            try {
                const response = await giangVienService.getByKhoa(selectedSubject.Khoa.ma_khoa);
                // Backend route getByKhoa trả errCode/data, nhưng vẫn hỗ trợ fallback shape khác.
                list = normalizeLecturerList(response);
            } catch (error) {
                console.error(error);
            }
        }

        // Nếu không lấy được theo khoa (hoặc môn không gắn khoa), fallback lấy toàn bộ GV.
        if (list.length === 0 || (formData.giangvien_id && !list.find(gv => gv.giangvien_id === formData.giangvien_id))) {
            try {
                const allRes = await giangVienService.getAll();
                list = normalizeLecturerList(allRes);
            } catch (error) {
                console.error(error);
            }
        }

        setLecturers(list);
    };

    if (formData.monhoc_id && subjects.length > 0) fetchLecturersByFaculty();
    else setLecturers([]);
  }, [formData.monhoc_id, subjects, formData.giangvien_id]);

  // 3. Init Form Data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Chuyển thu từ số nguyên (2=Mon...8=Sun) sang chuỗi nếu cần
        const thuIntToStr = { 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat', 8: 'Sun' };
        const thuStr = typeof initialData.thu === 'number'
          ? (thuIntToStr[initialData.thu] || 'Mon')
          : (initialData.thu || 'Mon');

        const tietBD = initialData.tiet_bat_dau || 1;
        const soTiet = initialData.so_tiet || 4;
        const { gio_batdau: computedStart, gio_ketthuc: computedEnd } = tietToGio(tietBD, soTiet);

        setFormData({
            ...initialData,
            thu: thuStr,
            ngay_batdau: initialData.ngay_batdau || initialData.ngay || '',
            lop_hanhchinh_ids: initialData.lop_hanhchinh_ids || [],
            tiet_bat_dau: tietBD,
            so_tiet: soTiet,
            gio_batdau: computedStart || initialData.gio_batdau || '07:00',
            gio_ketthuc: computedEnd || initialData.gio_ketthuc || '11:00',
            so_tuan: initialData.so_tuan || 15
        });
        
        const selectedSubject = subjects.find(s => s.monhoc_id === initialData.monhoc_id);
        if (selectedSubject) {
            setSubjectSearch(`${selectedSubject.ma_mon} - ${selectedSubject.ten_mon}`);
        }
        setLecturerSearch(initialData.ten_giang_vien || '');
        setClassSearch('');
      } else {
        const defaultSemester = semesters.length > 0 ? semesters[0] : null;
        // Logic lấy ngày hôm nay
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Tính toán thứ hiện tại để set mặc định
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = daysMap[today.getDay()];

        setFormData({
          hocky_id: defaultSemester ? defaultSemester.hocky_id : '',
          monhoc_id: '',
          giangvien_id: '',
          lop_hanhchinh_ids: [],
          thu: currentDay,
          tiet_bat_dau: 1,
          so_tiet: 4,
          gio_batdau: '07:00',
          gio_ketthuc: '11:00',
          phong: '',
          ngay_batdau: defaultSemester ? defaultSemester.ngay_batdau : todayStr,
          so_tuan: 15
        });
        setSubjectSearch('');
        setLecturerSearch('');
        setClassSearch('');
      }
      setErrors({});
      setShowSubjectDropdown(false);
      setShowLecturerDropdown(false);
      setShowClassDropdown(false);
    }
  }, [isOpen, initialData, semesters, subjects, classes]);

  useEffect(() => {
    if (!formData.giangvien_id) {
      if (!showLecturerDropdown) setLecturerSearch('');
      return;
    }

    const selectedLecturer = lecturers.find((lec) => lec.giangvien_id === formData.giangvien_id);
    if (!selectedLecturer) return;

    const label = `${selectedLecturer.ho || ''} ${selectedLecturer.ten || ''} - ${selectedLecturer.ma_gv || ''}`.trim();
    if (!showLecturerDropdown) {
      setLecturerSearch(label);
    }
  }, [formData.giangvien_id, lecturers, showLecturerDropdown]);

  // 4. Click Outside
  useEffect(() => {
    function handleClickOutside(event) {
        if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
            setShowSubjectDropdown(false);
        }
        if (lecturerDropdownRef.current && !lecturerDropdownRef.current.contains(event.target)) {
          setShowLecturerDropdown(false);
        }
        if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
            setShowClassDropdown(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [subjectDropdownRef, classDropdownRef]);

  // --- HÀM XỬ LÝ NGÀY THÁNG MỚI (FIX BUG) ---
  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    
    if (!dateStr) {
      setFormData(prev => ({ ...prev, ngay_batdau: '' }));
      return;
    }

    // Tạo đối tượng Date từ chuỗi
    const dateObj = new Date(dateStr);
    
    // Mảng ánh xạ thứ (getDay trả về 0 = Sun, 1 = Mon...)
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = daysMap[dateObj.getDay()];

    setFormData(prev => ({
      ...prev,
      ngay_batdau: dateStr,
      thu: dayOfWeek // Tự động cập nhật thứ
    }));
  };
  // ------------------------------------------

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Toggle chọn lớp hành chính (Multi-select)
  const toggleClassSelection = (classId) => {
      setFormData(prev => {
          const currentIds = prev.lop_hanhchinh_ids;
          if (currentIds.includes(classId)) {
              return { ...prev, lop_hanhchinh_ids: currentIds.filter(id => id !== classId) };
          } else {
              return { ...prev, lop_hanhchinh_ids: [...currentIds, classId] };
          }
      });
  };

  const getSelectedClassNames = () => {
      if (formData.lop_hanhchinh_ids.length === 0) return '';
      return classes
        .filter(c => formData.lop_hanhchinh_ids.includes(c.lop_hanhchinh_id))
        .map(c => c.ten_lop)
        .join(', ');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.hocky_id) newErrors.hocky_id = 'Vui lòng chọn học kỳ';
    if (!formData.monhoc_id) newErrors.monhoc_id = 'Vui lòng chọn môn học'; 
    if (!formData.giangvien_id) newErrors.giangvien_id = 'Vui lòng chọn giảng viên';
    if (!formData.phong.trim()) newErrors.phong = 'Phòng học là bắt buộc';
    if (!formData.ngay_batdau) newErrors.ngay_batdau = 'Ngày bắt đầu là bắt buộc';
    if (formData.lop_hanhchinh_ids.length === 0) newErrors.lop_hanhchinh_ids = 'Chọn ít nhất 1 lớp hành chính';
    if (!formData.so_tuan || formData.so_tuan <= 0) newErrors.so_tuan = 'Số tuần học không hợp lệ';
    if (formData.gio_batdau >= formData.gio_ketthuc) newErrors.gio = 'Giờ kết thúc phải sau giờ bắt đầu';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const filteredSubjects = subjects.filter(sub => 
    sub.ma_mon.toLowerCase().includes(subjectSearch.toLowerCase()) || 
    sub.ten_mon.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredClasses = classes.filter(cls => 
    cls.ten_lop.toLowerCase().includes(classSearch.toLowerCase())
  );

  const filteredLecturers = lecturers.filter((lec) => {
    const keyword = lecturerSearch.toLowerCase().trim();
    if (!keyword) return true;
    const fullName = `${lec.ho || ''} ${lec.ten || ''}`.toLowerCase();
    const maGv = (lec.ma_gv || '').toLowerCase();
    return fullName.includes(keyword) || maGv.includes(keyword);
  });

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-100">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-linear-to-r from-gray-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              {initialData ? <Edit2 size={20}/> : <Plus size={20}/>}
              {initialData ? 'Điều chỉnh Lịch giảng dạy' : 'Phân công Lớp học phần mới'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Vui lòng điền đầy đủ thông tin để hệ thống tạo lịch tự động</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-all">
            <X size={20} />
          </button>
        </div>
        
        {/* BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* --- CỘT TRÁI --- */}
             <div className="space-y-1">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#3B5998]">
                    <BookOpen size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">Thông tin Học phần</h4>
                </div>

                {/* HỌC KỲ */}
                <InputGroup label="Học kỳ áp dụng" required error={errors.hocky_id}>
                  <select 
                      value={formData.hocky_id}
                      onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedSemester = semesters.find(sem => sem.hocky_id === selectedId);
                          // Khi đổi học kỳ, reset ngày bắt đầu theo học kỳ đó và tính lại thứ
                          const newStartDate = selectedSemester ? selectedSemester.ngay_batdau : formData.ngay_batdau;
                          
                          // Tính lại thứ cho ngày mới
                          const d = new Date(newStartDate);
                          const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                          const newDay = daysMap[d.getDay()];

                          setFormData(prev => ({
                            ...prev,
                            hocky_id: selectedId,
                            ngay_batdau: newStartDate,
                            thu: newDay
                          }));
                      }}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] text-sm bg-white"
                  >
                      <option value="">-- Chọn học kỳ --</option>
                      {semesters.map(sem => (
                          <option key={sem.hocky_id} value={sem.hocky_id}>
                              {sem.ten_hocky}
                          </option>
                      ))}
                  </select>
                </InputGroup>
                
                {/* MÔN HỌC */}
                <InputGroup label="Môn học" required error={errors.monhoc_id}>
                   <div className="relative" ref={subjectDropdownRef}>
                     <div className="relative">
                       <input
                         type="text"
                         value={subjectSearch}
                         autoComplete="off"
                         onClick={() => setShowSubjectDropdown(true)}
                         onChange={(e) => {
                           setSubjectSearch(e.target.value);
                           setShowSubjectDropdown(true);
                           if (formData.monhoc_id) setFormData(prev => ({...prev, monhoc_id: '', giangvien_id: ''}));
                           if (errors.monhoc_id) setErrors(prev => ({...prev, monhoc_id: undefined}));
                         }}
                         placeholder="Nhập mã hoặc tên môn học..."
                         className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 text-sm bg-white pr-10 
                            ${errors.monhoc_id ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                       />
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                         {showSubjectDropdown ? <Search size={16} /> : <ChevronDown size={16} />}
                       </div>
                     </div>
                     
                     {showSubjectDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                           {filteredSubjects.length > 0 ? (
                             filteredSubjects.map(sub => (
                               <div
                                 key={sub.monhoc_id}
                                 onClick={() => {
                                   setFormData(prev => ({...prev, monhoc_id: sub.monhoc_id, giangvien_id: ''}));
                                   setSubjectSearch(`${sub.ma_mon} - ${sub.ten_mon}`);
                                   setShowSubjectDropdown(false);
                                   setErrors(prev => ({...prev, monhoc_id: undefined}));
                                 }}
                                 className={`px-3 py-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 flex justify-between items-center group
                                   ${formData.monhoc_id === sub.monhoc_id ? 'bg-blue-50 text-[#3B5998] font-medium' : 'text-gray-700'}`}
                               >
                                 <span className="group-hover:translate-x-1 transition-transform duration-200">
                                    <span className="font-bold">{sub.ma_mon}</span> - {sub.ten_mon} 
                                    <span className="text-gray-400 text-xs ml-2">({sub.sotinchi} TC)</span>
                                 </span>
                                 {formData.monhoc_id === sub.monhoc_id && <Check size={16} className="text-[#3B5998]" />}
                               </div>
                             ))
                           ) : (
                             <div className="px-3 py-4 text-sm text-gray-400 text-center flex flex-col items-center">
                                <Search size={24} className="mb-1 opacity-50"/>
                                Không tìm thấy môn học
                             </div>
                           )}
                        </div>
                     )}
                   </div>
                </InputGroup>

                {/* GIẢNG VIÊN */}
                <InputGroup label="Giảng viên phụ trách" required icon={User} error={errors.giangvien_id}>
                    <div className="relative" ref={lecturerDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={lecturerSearch}
                          autoComplete="off"
                          disabled={!formData.monhoc_id}
                          onClick={() => {
                            if (!formData.monhoc_id) return;
                            setShowLecturerDropdown(true);
                          }}
                          onChange={(e) => {
                            setLecturerSearch(e.target.value);
                            setShowLecturerDropdown(true);
                            if (formData.giangvien_id) setFormData(prev => ({ ...prev, giangvien_id: '' }));
                            if (errors.giangvien_id) setErrors(prev => ({ ...prev, giangvien_id: undefined }));
                          }}
                          placeholder={formData.monhoc_id
                            ? 'Tìm theo tên hoặc mã giảng viên...'
                            : 'Vui lòng chọn môn học trước'}
                          className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 text-sm bg-white
                            ${errors.giangvien_id ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}
                            ${!formData.monhoc_id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                        />

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          {showLecturerDropdown ? <Search size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {showLecturerDropdown && formData.monhoc_id && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                          {filteredLecturers.length > 0 ? (
                            filteredLecturers.map((lec) => {
                              const isSelected = formData.giangvien_id === lec.giangvien_id;
                              const label = `${lec.ho || ''} ${lec.ten || ''} - ${lec.ma_gv || ''}`.trim();

                              return (
                                <div
                                  key={lec.giangvien_id}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, giangvien_id: lec.giangvien_id }));
                                    setLecturerSearch(label);
                                    setShowLecturerDropdown(false);
                                    setErrors(prev => ({ ...prev, giangvien_id: undefined }));
                                  }}
                                  className={`px-3 py-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 flex justify-between items-center group
                                    ${isSelected ? 'bg-blue-50 text-[#3B5998] font-medium' : 'text-gray-700'}`}
                                >
                                  <span className="group-hover:translate-x-1 transition-transform duration-200">{label}</span>
                                  {isSelected && <Check size={16} className="text-[#3B5998]" />}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-4 text-sm text-gray-400 text-center flex flex-col items-center">
                              <Search size={24} className="mb-1 opacity-50" />
                              Không tìm thấy giảng viên
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </InputGroup>

                {/* LỚP HÀNH CHÍNH (MULTI-SELECT) */}
                <InputGroup label="Lớp hành chính tham gia" required icon={Layers} error={errors.lop_hanhchinh_ids}>
                    <div className="relative" ref={classDropdownRef}>
                        <div className="relative">
                            <input
                                type="text"
                                value={showClassDropdown ? classSearch : getSelectedClassNames()}
                                readOnly={!showClassDropdown}
                                onClick={() => {
                                    setShowClassDropdown(true);
                                    setClassSearch('');
                                }}
                                onChange={(e) => setClassSearch(e.target.value)}
                                placeholder={formData.lop_hanhchinh_ids.length > 0 ? "" : "Chọn một hoặc nhiều lớp..."}
                                className={`w-full pl-10 pr-8 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 text-sm bg-white 
                                    ${errors.lop_hanhchinh_ids ? 'border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                            />
                            
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Layers size={16} /> 
                            </div>
                            
                            {formData.lop_hanhchinh_ids.length > 0 && !showClassDropdown && (
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFormData(prev => ({...prev, lop_hanhchinh_ids: []}));
                                    }}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                >
                                    <X size={14} />
                                </button>
                            )}

                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                        
                        {showClassDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                {filteredClasses.length > 0 ? (
                                    filteredClasses.map(cls => {
                                        const isSelected = formData.lop_hanhchinh_ids.includes(cls.lop_hanhchinh_id);
                                        return (
                                            <div
                                                key={cls.lop_hanhchinh_id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleClassSelection(cls.lop_hanhchinh_id);
                                                }}
                                                className={`px-3 py-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 flex justify-between items-center select-none
                                                    ${isSelected ? 'bg-blue-50' : ''}`}
                                            >
                                                <span className={`${isSelected ? 'text-[#3B5998] font-medium' : 'text-gray-700'}`}>
                                                    {cls.ten_lop} 
                                                    <span className="text-gray-400 text-xs ml-2">(K{cls.nien_khoa})</span>
                                                </span>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                    ${isSelected ? 'bg-[#3B5998] border-[#3B5998]' : 'bg-white border-gray-300'}`}>
                                                    {isSelected && <Check size={14} className="text-white" />}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="px-3 py-4 text-sm text-gray-400 text-center flex flex-col items-center">
                                        <Search size={24} className="mb-1 opacity-50"/>
                                        Không tìm thấy lớp
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </InputGroup>
             </div>

             {/* --- CỘT PHẢI --- */}
             <div className="space-y-1">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                    <Calendar size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">Thời gian & Địa điểm</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Ngày bắt đầu học" required error={errors.ngay_batdau}>
                        <input 
                            type="date"
                            value={formData.ngay_batdau}
                            onChange={handleDateChange} // <-- SỬ DỤNG HÀM XỬ LÝ MỚI
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#3B5998] text-sm"
                        />
                    </InputGroup>

                    <InputGroup label="Số tuần học (Số buổi)" required icon={Hash} error={errors.so_tuan}>
                        <input 
                            type="number"
                            min="1"
                            max="50"
                            value={formData.so_tuan}
                            onChange={(e) => setFormData({...formData, so_tuan: parseInt(e.target.value)})}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#3B5998] text-sm"
                        />
                    </InputGroup>
                </div>
                
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                        Lịch học hàng tuần
                        <span className="text-xs font-normal text-gray-400 flex items-center gap-1">
                            {initialData ? (
                                <><Lock size={10} /> Cố định khi sửa</>
                            ) : (
                                <><Calendar size={10} className="text-[#3B5998]" /> Chọn thứ trong tuần</>
                            )}
                        </span>
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                            const isSelected = formData.thu === day;
                            const isDisabled = !!initialData;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setFormData({ ...formData, thu: day })}
                                    className={`py-2 text-xs font-bold rounded-md border transition-all shadow-sm
                                        ${isSelected
                                            ? 'bg-[#3B5998] text-white border-[#3B5998] ring-2 ring-offset-1 ring-[#3B5998]' 
                                            : isDisabled 
                                                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-[#3B5998]/50'
                                        }`}
                                >
                                    {day === 'Sun' ? 'CN' : `T${['Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day) + 2}`}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Tiết bắt đầu" icon={Clock} required>
                        <select
                            value={formData.tiet_bat_dau}
                            onChange={(e) => {
                                const tietBD = parseInt(e.target.value);
                                const { gio_batdau, gio_ketthuc } = tietToGio(tietBD, formData.so_tiet);
                                setFormData(prev => ({ ...prev, tiet_bat_dau: tietBD, gio_batdau, gio_ketthuc }));
                            }}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#3B5998] text-sm bg-white"
                        >
                            {[1,2,3,4,5,6,7,8,9,10].map(t => (
                                <option key={t} value={t}>Tiết {t} ({TIET_START[t]})</option>
                            ))}
                        </select>
                    </InputGroup>

                    <InputGroup label="Số tiết" icon={Clock} required>
                        <select
                            value={formData.so_tiet}
                            onChange={(e) => {
                                const soTiet = parseInt(e.target.value);
                                const { gio_batdau, gio_ketthuc } = tietToGio(formData.tiet_bat_dau, soTiet);
                                setFormData(prev => ({ ...prev, so_tiet: soTiet, gio_batdau, gio_ketthuc }));
                            }}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#3B5998] text-sm bg-white"
                        >
                            {[1,2,3,4,5,6].map(s => (
                                <option key={s} value={s}>{s} tiết</option>
                            ))}
                        </select>
                    </InputGroup>
                </div>

                {/* Hiển thị giờ tự tính */}
                {formData.gio_batdau && formData.gio_ketthuc && (
                    <div className="-mt-2 mb-3 px-3 py-2 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-[#3B5998] font-medium">
                        <Clock size={14} />
                        Giờ học: {formData.gio_batdau} – {formData.gio_ketthuc}
                    </div>
                )}

                <InputGroup label="Phòng học" required icon={MapPin} error={errors.phong}>
                    <input 
                        type="text" 
                        value={formData.phong}
                        onChange={(e) => setFormData({...formData, phong: e.target.value})}
                        placeholder="VD: Nhà A - P.302"
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] transition-all text-sm"
                    />
                </InputGroup>
             </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="text-xs text-gray-500">
                * Các buổi học sẽ được tự động tạo dựa trên ngày bắt đầu
            </div>
            <div className="flex gap-3">
                <button 
                onClick={onClose}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors text-sm shadow-sm"
                >
                Hủy bỏ
                </button>
                <button 
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
                >
                <Save size={18} /> 
                {initialData ? 'Lưu thay đổi' : 'Xác nhận & Tạo lịch'}
                </button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AssignmentModal;