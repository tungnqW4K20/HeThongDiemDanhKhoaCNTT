import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, GraduationCap, Search, X, Mail, Phone, 
  Calendar, Edit2, Trash2, Plus, Loader2, Upload, UserCheck 
} from 'lucide-react'; 
import Badge from './Badge';
import Avatar from './Avatar';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditStudentModal from './EditStudentModal';
import AddStudentModal from './AddStudentModal';
import ImportStudentModal from './ImportStudentModal';
import ImportResultModal from '../common/ImportResultModal';
import studentService from '../../service/studentService';
import classService from '../../service/classService';
import khoaService from '../../service/khoaService';
import cosoService from '../../service/cosoService';
import giangVienService from '../../service/giangVienService';
import SearchableSelect from '../common/SearchableSelect';

const ClassDetailView = ({ classInfo, onBack, canEdit = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsList, setStudentsList] = useState([]); 
  const [classMeta, setClassMeta] = useState(classInfo || {});
  const [gvcn, setGvcn] = useState(null); // Lưu thông tin GVCN từ API
  const [loading, setLoading] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importResultModalOpen, setImportResultModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importSuccessRows, setImportSuccessRows] = useState([]);
  const [importFailedRows, setImportFailedRows] = useState([]);
  const [editClassModalOpen, setEditClassModalOpen] = useState(false);
  const [classSaving, setClassSaving] = useState(false);
  const [classForm, setClassForm] = useState({
    ten_lop: '',
    nien_khoa: '',
    chuong_trinh: '',
    ghichu: '',
    khoa_id: '',
    chuyennganh_id: '',
    coso_id: '',
    giangvien_id: ''
  });
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [majorOptions, setMajorOptions] = useState([]);
  const [campusOptions, setCampusOptions] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const extractList = (res) => {
    const body = res?.data ?? res;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    return [];
  };

  // Fetch dữ liệu từ API
  const fetchStudents = useCallback(async () => {
    if (!classInfo?.id) return;
    setLoading(true);
    try {
        const res = await studentService.getByClass(classInfo.id);
        // Cấu trúc API: res.data.danh_sach_sinh_vien & res.data.giang_vien_chu_nhiem
        if (res && res.success) {
            setStudentsList(res.data.danh_sach_sinh_vien || []);
            setGvcn(res.data.giang_vien_chu_nhiem || null);
        } else {
            console.error("Format data không đúng:", res);
            setStudentsList([]);
        }
    } catch (error) {
        console.error("Lỗi lấy danh sách sinh viên:", error);
    } finally {
        setLoading(false);
    }
  }, [classInfo?.id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setClassMeta(classInfo || {});
  }, [classInfo]);

  useEffect(() => {
    const fetchEditOptions = async () => {
      try {
        const [khoaRes, majorRes, cosoRes, gvRes] = await Promise.all([
          khoaService.getAll(),
          khoaService.getAllChuyenNganh(),
          cosoService.getAll(),
          giangVienService.getAll()
        ]);

        setDepartmentOptions(extractList(khoaRes));
        setMajorOptions(extractList(majorRes));
        setCampusOptions(extractList(cosoRes));
        setTeacherOptions(extractList(gvRes));
      } catch (error) {
        console.error('Lỗi tải danh mục sửa lớp:', error);
      }
    };

    fetchEditOptions();
  }, []);

  // --- HÀM XỬ LÝ LOGIC (GIỮ NGUYÊN) ---
  const handleAddStudent = async (newStudentData) => {
    try {
        const res = await studentService.create(newStudentData);
        if (res.success || res.errCode === 0) {
            alert(res.message || "Thêm thành công");
            setAddModalOpen(false);
            fetchStudents(); 
        } else {
            alert("Thêm thất bại: " + res.message);
        }
    } catch (error) {
        console.error("Lỗi thêm sinh viên:", error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage || "Có lỗi xảy ra khi thêm sinh viên");
    }
  };

  const handleConfirmEdit = async (updatedStudent) => {
    try {
        const res = await studentService.update(updatedStudent.sinhvien_id, updatedStudent);
        if (res.success || res.errCode === 0) {
            alert(res.message || "Cập nhật thành công");
            setEditModalOpen(false);
            setSelectedStudent(null);
            fetchStudents(); 
        } else {
            alert("Cập nhật thất bại: " + res.message);
        }
    } catch (error) {
        console.error("Lỗi cập nhật sinh viên:", error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage || "Có lỗi xảy ra khi cập nhật sinh viên");
    }
  };

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
        const res = await studentService.delete(selectedStudent.sinhvien_id);
        if (res.success || res.errCode === 0) {
             setStudentsList(prev => prev.filter(s => s.sinhvien_id !== selectedStudent.sinhvien_id));
             setDeleteModalOpen(false);
             setSelectedStudent(null);
        } else {
            alert("Xóa thất bại: " + res.message);
        }
    } catch (error) {
        console.error("Lỗi xóa sinh viên:", error);
        alert("Có lỗi xảy ra khi xóa");
    }
  };

  const handleEditClick = (student) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleImportStudent = async (file, classId) => {
    try {
      const res = await studentService.importExcel(file, classId);
      if (res && (res.success || res.errCode === 0)) {
        const payload = res.data || {};
        const successRows = Array.isArray(payload.success_rows) ? payload.success_rows : [];
        const failedRows = Array.isArray(payload.failed_rows) ? payload.failed_rows : [];

        setImportSummary({
          totalRows: Number(payload.total ?? (successRows.length + failedRows.length)),
          successCount: Number(payload.created ?? successRows.length),
          failedCount: Number(payload.failed ?? failedRows.length)
        });
        setImportSuccessRows(successRows);
        setImportFailedRows(failedRows);
        setImportResultModalOpen(true);
        setImportModalOpen(false);
        fetchStudents();
      } else {
        throw new Error(res.message || "Import thất bại");
      }
    } catch (error) {
      console.error("Import Error:", error);
      const errorResponse = error.response?.data || {};
      const errorMessage = errorResponse.message || error.message || "Lỗi server";
      const customError = new Error(errorMessage);
      customError.details = errorResponse.details || [];
      throw customError;
    }
  };

  const openEditClassModal = () => {
    setClassForm({
      ten_lop: classMeta?.name || '',
      nien_khoa: classMeta?.year || '',
      chuong_trinh: classMeta?.program || 'Đại học',
      ghichu: classMeta?.ghichu || '',
      khoa_id: classMeta?.khoa_id || '',
      chuyennganh_id: classMeta?.chuyennganh_id || '',
      coso_id: classMeta?.coso_id || '',
      giangvien_id: classMeta?.giangvien_id || ''
    });
    setEditClassModalOpen(true);
  };

  const handleClassFormChange = (field, value) => {
    setClassForm((prev) => {
      if (field === 'khoa_id') {
        return {
          ...prev,
          khoa_id: value,
          chuyennganh_id: ''
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSaveClassInfo = async () => {
    if (!classInfo?.id) return;

    if (!classForm.ten_lop?.trim()) {
      alert('Tên lớp không được để trống.');
      return;
    }

    const nienKhoa = Number(classForm.nien_khoa);
    if (!Number.isInteger(nienKhoa) || nienKhoa < 1900 || nienKhoa > 3000) {
      alert('Niên khóa không hợp lệ. Ví dụ: 2022.');
      return;
    }

    setClassSaving(true);
    try {
      const payload = {
        ten_lop: classForm.ten_lop.trim(),
        nien_khoa: nienKhoa,
        chuong_trinh: classForm.chuong_trinh?.trim() || 'Đại học',
        ghichu: classForm.ghichu?.trim() || null,
        khoa_id: classForm.khoa_id || null,
        chuyennganh_id: classForm.chuyennganh_id || null,
        coso_id: classForm.coso_id || null,
        giangvien_id: classForm.giangvien_id || null
      };

      const res = await classService.update(classInfo.id, payload);
      if (!(res?.success || res?.errCode === 0)) {
        throw new Error(res?.message || 'Cập nhật lớp thất bại.');
      }

      setClassMeta((prev) => ({
        ...prev,
        name: payload.ten_lop,
        year: payload.nien_khoa,
        program: payload.chuong_trinh,
        ghichu: payload.ghichu,
        khoa_id: payload.khoa_id || '',
        chuyennganh_id: payload.chuyennganh_id || '',
        coso_id: payload.coso_id || '',
        giangvien_id: payload.giangvien_id || '',
        department: departmentOptions.find((item) => item.khoa_id === payload.khoa_id)?.ten_khoa || prev.department
      }));

      fetchStudents();
      setEditClassModalOpen(false);
      alert(res?.message || 'Cập nhật lớp thành công.');
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage || error.message || 'Có lỗi xảy ra khi cập nhật lớp.');
    } finally {
      setClassSaving(false);
    }
  };

  const filteredStudents = studentsList.filter(sv => 
    (sv.ten && sv.ten.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (sv.ma_sv && sv.ma_sv.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString) => {
      if(!dateString) return "---";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
      } catch { return dateString; }
  };

  const filteredMajorOptions = majorOptions.filter((item) => {
    if (!classForm.khoa_id) return true;
    const khoaId = item?.khoa_id || item?.Khoa?.khoa_id;
    return !khoaId || khoaId === classForm.khoa_id;
  });

  const departmentSelectOptions = departmentOptions.map((item) => ({
    value: item.khoa_id,
    label: item.ten_khoa
  }));

  const majorSelectOptions = filteredMajorOptions.map((item) => ({
    value: item.chuyennganh_id,
    label: item.ten_chuyennganh
  }));

  const campusSelectOptions = campusOptions.map((item) => ({
    value: item.coso_id,
    label: item.ten_coso
  }));

  const teacherSelectOptions = teacherOptions.map((item) => ({
    value: item.giangvien_id,
    label: `${item.ho || ''} ${item.ten || ''}`.trim() || item.ma_gv || item.email || 'Giảng viên'
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Modals */}
      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        studentName={selectedStudent?.ten}
      />
      <EditStudentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleConfirmEdit}
        student={selectedStudent}
      />
      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddStudent}
        classId={classInfo.id}
      />
      <ImportStudentModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportStudent}
        classId={classInfo.id}
      />
      <ImportResultModal
        isOpen={importResultModalOpen}
        onClose={() => setImportResultModalOpen(false)}
        title="Kết quả import sinh viên"
        summary={importSummary}
        successRows={importSuccessRows}
        failedRows={importFailedRows}
      />

      {editClassModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed left-0 top-0 z-9999 h-screen w-screen bg-black/45 backdrop-blur-[1px] p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">Sửa thông tin lớp hành chính</h3>
              <button
                onClick={() => setEditClassModalOpen(false)}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp</label>
                <input
                  type="text"
                  value={classForm.ten_lop}
                  onChange={(e) => handleClassFormChange('ten_lop', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niên khóa</label>
                <input
                  type="number"
                  value={classForm.nien_khoa}
                  onChange={(e) => handleClassFormChange('nien_khoa', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chương trình</label>
                <input
                  type="text"
                  value={classForm.chuong_trinh}
                  onChange={(e) => handleClassFormChange('chuong_trinh', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Khoa"
                  options={departmentSelectOptions}
                  value={classForm.khoa_id}
                  onChange={(val) => handleClassFormChange('khoa_id', val)}
                  placeholder="-- Chưa chọn khoa --"
                  menuZIndexClass="z-60"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Chuyên ngành"
                  options={majorSelectOptions}
                  value={classForm.chuyennganh_id}
                  onChange={(val) => handleClassFormChange('chuyennganh_id', val)}
                  placeholder={classForm.khoa_id ? '-- Chọn chuyên ngành --' : 'Chọn khoa trước'}
                  disabled={!classForm.khoa_id}
                  menuZIndexClass="z-50"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Cơ sở"
                  options={campusSelectOptions}
                  value={classForm.coso_id}
                  onChange={(val) => handleClassFormChange('coso_id', val)}
                  placeholder="-- Chưa chọn cơ sở --"
                  menuZIndexClass="z-40"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Giảng viên chủ nhiệm"
                  options={teacherSelectOptions}
                  value={classForm.giangvien_id}
                  onChange={(val) => handleClassFormChange('giangvien_id', val)}
                  placeholder="-- Chưa phân công --"
                  menuZIndexClass="z-30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={classForm.ghichu}
                  onChange={(e) => handleClassFormChange('ghichu', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
              <button
                onClick={() => setEditClassModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveClassInfo}
                disabled={classSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#3B5998] hover:bg-[#2e4676] disabled:opacity-60"
              >
                {classSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-gray-500 hover:text-[#3B5998] transition-colors font-medium text-sm"
        >
          <div className="p-1.5 rounded-full bg-white border border-gray-200 group-hover:border-[#3B5998] transition-colors">
            <ArrowLeft size={16} />
          </div>
          Quay lại danh sách
        </button>
        <div className="flex gap-3">
          {canEdit && (
            <>
              <button
                onClick={openEditClassModal}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 size={16}/> Sửa thông tin lớp
              </button>
                <button 
                    onClick={() => setImportModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Upload size={16}/> Import Excel
                </button>
                <button 
                    onClick={() => setAddModalOpen(true)}
                    className="px-4 py-2 bg-[#3B5998] text-white text-sm font-medium rounded-lg hover:bg-[#2e4676] flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={16}/> Thêm sinh viên
                </button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <GraduationCap size={120} className="text-[#3B5998]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <Badge type="blue">Chính quy</Badge>
              <Badge type="gray">Khóa {classMeta.year}</Badge>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-1">{classMeta.name}</h1>
            <p className="text-sm text-gray-400 mt-1 uppercase font-semibold">{classMeta.department}</p>

            <div className="mt-6 flex items-center gap-10">
                <div>
                     <p className="text-xs text-gray-500 uppercase font-semibold">Tổng sinh viên</p>
                     <p className="font-bold text-2xl text-[#3B5998]">{studentsList.length}</p>
                </div>
                
                {/* HIỂN THỊ GVCN VÀ SĐT NHANH Ở ĐÂY */}
                {gvcn && (
                  <div className="border-l pl-10">
                      <p className="text-xs text-gray-500 uppercase font-semibold">GV Chủ nhiệm</p>
                      <p className="font-bold text-gray-700">{gvcn.ho_ten}</p>
                      <p className="text-sm text-[#3B5998] flex items-center gap-1.5 font-medium mt-0.5">
                        <Phone size={13} /> {gvcn.sdt || "Chưa có SĐT"}
                      </p>
                  </div>
                )}
            </div>
          </div>
        </div>
        
        {/* Thông tin GVCN Card (Bên phải) */}
        <div className="bg-linear-to-br from-[#3B5998] to-[#2e4676] rounded-xl p-6 shadow-md text-white flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck size={20} className="text-blue-200" />
                  <h3 className="font-semibold text-lg">Giảng viên chủ nhiệm</h3>
                </div>
                {gvcn ? (
                  <div className="space-y-3">
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Họ và tên</p>
                        <p className="text-base font-semibold">{gvcn.ho_ten}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Số điện thoại</p>
                        <p className="text-base font-bold flex items-center gap-2">
                          <Phone size={14} className="text-green-400" /> {gvcn.sdt || "---"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Email liên hệ</p>
                        <p className="text-sm text-blue-50 flex items-center gap-2 italic">
                          <Mail size={14} /> {gvcn.email || "Chưa cập nhật"}
                        </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-blue-100 text-sm italic">Chưa phân công giảng viên</p>
                )}
            </div>
            {/* <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10 backdrop-blur-sm">
                Gửi thông báo nhanh
            </button> */}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
           <h3 className="font-bold text-gray-800 text-lg">Danh sách sinh viên</h3>
           <div className="flex gap-2">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-[#3B5998]" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên hoặc mã SV..." 
                  className="pl-9 pr-8 py-1.5 text-xs border border-gray-300 rounded-md w-56 focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
             </div>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#3B5998]/10 border-b border-[#3B5998]/10">
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[10%]">Mã SV</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[20%]">Họ và tên</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[20%]">Liên hệ</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[15%]">Ngày sinh</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[10%]">Trạng thái</th>
                {canEdit && <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[15%] text-center">Chức năng</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                    <td colSpan={canEdit ? 6 : 5} className="px-6 py-8 text-center">
                        <div className="flex justify-center items-center gap-2 text-gray-500">
                             <Loader2 className="animate-spin" size={20} /> Đang tải dữ liệu...
                        </div>
                    </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((sv) => (
                  <tr key={sv.sinhvien_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500 font-medium">{sv.ma_sv}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={sv.ten} />
                        <span className="font-medium text-gray-900">{sv.ten}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                          <Mail size={12} className="text-gray-400" /> {sv.email || "---"}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                          <Phone size={12} className="text-gray-400" /> {sv.sdt || "---"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" /> {formatDate(sv.ngaysinh)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge type={sv.trang_thai === 'Cảnh báo' ? 'yellow' : 'green'}>
                          {sv.trang_thai || 'Đang học'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(sv)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(sv)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa sinh viên"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-8 text-center text-gray-500 italic">
                    Lớp chưa có sinh viên nào hoặc không tìm thấy kết quả.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailView;
