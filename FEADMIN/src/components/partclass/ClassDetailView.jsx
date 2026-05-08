import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, BookOpen, User, Phone, Users, 
  Plus, FileSpreadsheet, Trash2, Search, Loader2, Pencil, X
} from 'lucide-react';
import Badge from './Badge';
import AddStudentModal from './AddStudentModal';
import ImportStudentModal from './ImportStudentModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import hocPhanService from '../../service/lophocphanService';
import classService from '../../service/classService';
import { useAuth } from '../../hooks/useAuth';


const ClassDetailView = ({ classInfo, onBack }) => {
  const { user } = useAuth();
  const [detailInfo, setDetailInfo] = useState(classInfo);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingClassInfo, setIsSavingClassInfo] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddStudentSubmitting, setIsAddStudentSubmitting] = useState(false);
  const [allAdminClasses, setAllAdminClasses] = useState([]);
  const [isSearchAddModalOpen, setIsSearchAddModalOpen] = useState(false);
  
  // States điều khiển Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    ten_lophocphan: '',
    selected_admin_class_ids: [],
    admin_class_search: '',
    phong: '',
    thu: '',
    tiet_bat_dau: '',
    so_tiet: '',
    tuan_hoc: '',
    loai_hoc_phan: 'LT'
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await hocPhanService.getStudents(classInfo.id);
      if (res.success) {
        const rawList = Array.isArray(res.data) ? res.data : [];
        const mappedStudents = rawList
          .map((item) => {
            const sv = item?.SinhVien || item;
            if (!sv?.sinhvien_id) return null;

            return {
              id: sv.sinhvien_id,
              sinhvien_id: sv.sinhvien_id,
              ma_sv: sv.ma_sv,
              ten: sv.ten,
              ngaysinh: sv.ngaysinh,
              email: sv.email,
              sdt: sv.sdt,
              lop_hanhchinh_id: sv.lop_hanhchinh_id,
              trang_thai: sv.trang_thai || 'Đang học',
              ten_lop_hc: sv.Lop?.ten_lop || 'N/A'
            };
          })
          .filter(Boolean);

        setStudents(mappedStudents);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách SV:", error);
      alert("Không thể lấy danh sách sinh viên");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---
  const handleAddStudent = async (payload) => {
    try {
      setIsAddStudentSubmitting(true);
      const res = await hocPhanService.addStudentsFromAdminClass(classInfo.id, payload);
      if (!res?.success) {
        throw new Error(res?.message || 'Thêm sinh viên thất bại');
      }

      const added = res?.data?.added || 0;
      const existed = res?.data?.existed || 0;
      alert(`${res.message || 'Thêm sinh viên thành công'} (Mới: ${added}, Đã có: ${existed})`);
      if (!payload?.keepOpen) {
        setIsAddModalOpen(false);
        setIsSearchAddModalOpen(false);
      }
      fetchStudents();
      return true;
    } catch (error) {
      console.error('Lỗi thêm sinh viên từ lớp hành chính:', error);
      alert(error?.response?.data?.message || error.message || 'Có lỗi xảy ra khi thêm sinh viên');
      throw error;
    } finally {
      setIsAddStudentSubmitting(false);
    }
  };

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudent?.sinhvien_id) return;
    try {
      const res = await hocPhanService.removeStudentFromClass(classInfo.id, selectedStudent.sinhvien_id);
      const isSuccess = res?.success ?? (res?.errCode === undefined ? true : res?.errCode === 0);
      if (isSuccess) {
        const deletedAttendanceCount = res?.data?.deleted_attendance_count || 0;
        alert(`${res.message || 'Đã gỡ sinh viên khỏi lớp học phần'}\nĐã xóa ${deletedAttendanceCount} bản ghi điểm danh liên quan.`);
        setIsDeleteModalOpen(false);
        setSelectedStudent(null);
        fetchStudents();
      } else {
        alert(res?.message || 'Không thể gỡ sinh viên khỏi lớp học phần');
      }
    } catch (error) {
      console.error('Lỗi gỡ sinh viên khỏi lớp học phần:', error);
      alert(error?.response?.data?.message || 'Có lỗi xảy ra khi gỡ sinh viên khỏi lớp học phần');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classInfo.id]);

  useEffect(() => {
    setDetailInfo(classInfo);
  }, [classInfo]);

  useEffect(() => {
    const fetchAllAdminClasses = async () => {
      try {
        const res = await classService.getAll();
        const body = res?.data ?? res;
        const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];

        const options = list
          .filter((item) => item?.lop_hanhchinh_id && item?.ten_lop)
          .map((item) => ({
            id: item.lop_hanhchinh_id,
            name: item.ten_lop
          }));

        setAllAdminClasses(options);
      } catch (error) {
        console.error('Lỗi tải danh sách lớp hành chính:', error);
        setAllAdminClasses([]);
      }
    };

    fetchAllAdminClasses();
  }, []);

  // 2. Cập nhật hàm xử lý Import Excel
  const handleImportStudent = async (file) => {
    try {
      setIsLoading(true);
      const res = await hocPhanService.importExcel(classInfo.id, file);
      if (res.success) {
        alert(`Import thành công ${res.summary.imported} sinh viên!`);
        fetchStudents(); // Load lại danh sách sau khi import thành công
        setIsImportModalOpen(false);
      }
    } catch (error) {
      // Xử lý hiển thị lỗi validate (nếu có mảng errors từ backend trả về)
      const errorMsg = error.response?.data?.errors 
        ? error.response.data.errors.join('\n') 
        : error.message;
      alert("Lỗi Import:\n" + errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const adminClassOptions = useMemo(() => {
    if (Array.isArray(detailInfo?.adminClassOptions) && detailInfo.adminClassOptions.length > 0) {
      return detailInfo.adminClassOptions;
    }

    if (Array.isArray(detailInfo?.adminClasses)) {
      return detailInfo.adminClasses.map((name) => ({ id: name, name }));
    }

    return [];
  }, [detailInfo]);

  const filteredStudents = students.filter((s) =>
    (s.ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.ma_sv || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditClassModal = () => {
    const weekValues = Array.isArray(detailInfo?.tuanHoc)
      ? detailInfo.tuanHoc
      : String(detailInfo?.tuanHoc || '')
          .replace(/\[|\]/g, '')
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isInteger(item) && item > 0);

    const selectedIds = Array.isArray(detailInfo?.adminClassOptions)
      ? detailInfo.adminClassOptions
          .map((item) => item?.id)
          .filter(Boolean)
      : [];

    setClassForm({
      ten_lophocphan: detailInfo?.className || '',
      selected_admin_class_ids: selectedIds,
      admin_class_search: '',
      phong: detailInfo?.room || '',
      thu: detailInfo?.dayOfWeek || '',
      tiet_bat_dau: detailInfo?.tietBatDau || '',
      so_tiet: detailInfo?.soTiet || '',
      tuan_hoc: weekValues.join(','),
      loai_hoc_phan: detailInfo?.loaiHocPhan || 'LT'
    });
    setIsEditClassModalOpen(true);
  };

  const handleSelectAdminClass = (adminClassId) => {
    if (!adminClassId) return;

    setClassForm((prev) => ({
      ...prev,
      selected_admin_class_ids: prev.selected_admin_class_ids.includes(adminClassId)
        ? prev.selected_admin_class_ids.filter((id) => id !== adminClassId)
        : [...prev.selected_admin_class_ids, adminClassId]
    }));
  };

  const handleRemoveAdminClass = (adminClassId) => {
    setClassForm((prev) => ({
      ...prev,
      selected_admin_class_ids: prev.selected_admin_class_ids.filter((id) => id !== adminClassId)
    }));
  };

  const filteredAdminClassOptions = useMemo(() => {
    const keyword = String(classForm.admin_class_search || '').trim().toLowerCase();
    if (!keyword) return allAdminClasses;
    return allAdminClasses.filter((item) => String(item?.name || '').toLowerCase().includes(keyword));
  }, [allAdminClasses, classForm.admin_class_search]);

  const handleSaveClassInfo = async (e) => {
    e.preventDefault();

    const normalizedAdminClassIds = (classForm.selected_admin_class_ids || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    if (!classForm.ten_lophocphan.trim() || normalizedAdminClassIds.length === 0 || !classForm.phong.trim()) {
      alert('Vui lòng nhập đầy đủ tên lớp học phần, lớp hành chính và phòng học.');
      return;
    }

    const payload = {
      ten_lophocphan: classForm.ten_lophocphan.trim(),
      lop_hanhchinh_ids: normalizedAdminClassIds,
      phong: classForm.phong.trim(),
      thu: Number(classForm.thu),
      tiet_bat_dau: Number(classForm.tiet_bat_dau),
      so_tiet: Number(classForm.so_tiet),
      tuan_hoc: classForm.tuan_hoc,
      loai_hoc_phan: classForm.loai_hoc_phan
    };

    setIsSavingClassInfo(true);
    try {
      const res = await hocPhanService.updateInfo(detailInfo.id, payload);
      if (!res?.success) {
        alert(res?.message || 'Cập nhật lớp học phần thất bại.');
        return;
      }

      const updated = res?.data || {};
      const updatedAdminClassOptions = Array.isArray(updated.DanhSachLopHanhChinh)
        ? updated.DanhSachLopHanhChinh
            .filter((item) => item?.lop_hanhchinh_id && item?.ten_lop)
            .map((item) => ({
              id: item.lop_hanhchinh_id,
              name: item.ten_lop
            }))
        : allAdminClasses.filter((item) => normalizedAdminClassIds.includes(item.id));

      setDetailInfo((prev) => ({
        ...prev,
        className: updated.ten_lophocphan || payload.ten_lophocphan,
        maLop: updated.ma_lop || '',
        room: updated.phong || payload.phong,
        dayOfWeek: updated.thu || payload.thu,
        tietBatDau: updated.tiet_bat_dau || payload.tiet_bat_dau,
        soTiet: updated.so_tiet || payload.so_tiet,
        tuanHoc: Array.isArray(updated.tuan_hoc)
          ? updated.tuan_hoc
          : String(payload.tuan_hoc)
              .split(',')
              .map((item) => Number(item.trim()))
              .filter((item) => Number.isInteger(item) && item > 0),
        loaiHocPhan: updated.loai_hoc_phan || payload.loai_hoc_phan,
        isPractical: (updated.loai_hoc_phan || payload.loai_hoc_phan) === 'TH',
        adminClasses: updatedAdminClassOptions.map((item) => item.name),
        adminClassOptions: updatedAdminClassOptions
      }));

      setIsEditClassModalOpen(false);
      setSaveNotice({
        type: 'success',
        text: 'Cập nhật thông tin lớp học phần thành công.'
      });
    } catch (error) {
      setSaveNotice({
        type: 'error',
        text: 'Không thể cập nhật lớp học phần. Vui lòng thử lại.'
      });
    } finally {
      setIsSavingClassInfo(false);
    }
  };

  useEffect(() => {
    if (!saveNotice) return undefined;
    const timer = setTimeout(() => setSaveNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [saveNotice]);


  return (
    <div className="animate-in fade-in duration-300 space-y-6 pb-10">
      {/* Nút Quay lại */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-[#3B5998] font-medium transition-colors">
          <ArrowLeft size={18} /> Quay lại danh sách lớp
        </button>

        {user?.vaitro !== 'truongbomon' && user?.vaitro !== 'lanhdao' && (
            <button
            onClick={openEditClassModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#3B5998]/20 text-[#3B5998] hover:bg-[#3B5998]/5 font-semibold text-sm"
            >
            <Pencil size={16} /> Sửa thông tin lớp học phần
            </button>
        )}
      </div>

      {/* PHẦN 1: THÔNG TIN TỔNG QUAN (GIỮ NGUYÊN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Badge type={classInfo.isPractical ? 'yellow' : 'blue'}>Lớp học phần</Badge>
              <span className="text-xs text-gray-400 font-medium italic">{detailInfo.semesterName}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">{detailInfo.subjectName}</h1>
            <p className="text-[#3B5998] font-bold flex items-center gap-2 mb-8">
              <BookOpen size={20} /> Tên HP: {detailInfo.className}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-50">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Thứ học</p>
                <p className="font-bold text-gray-700">Thứ {detailInfo.dayOfWeek}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Phòng học</p>
                <p className="font-bold text-[#3B5998]">{detailInfo.room}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Mã môn</p>
                <p className="font-bold text-gray-700">{detailInfo.subjectCode}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Số lớp HC</p>
                <p className="font-bold text-gray-700">{adminClassOptions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-[#3B5998]" /> Các lớp hành chính tham gia học
            </h3>
            <div className="flex flex-wrap gap-3">
              {adminClassOptions.map((lop, idx) => (
                <div key={lop.id || idx} className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 font-bold text-gray-700 text-sm">
                  {lop.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Giảng viên */}
        <div className="bg-linear-to-br from-[#3B5998] to-[#1d2d50] rounded-2xl p-6 text-white shadow-xl h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <User size={20} className="text-blue-300" /> Giảng viên phụ trách
          </h3>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-xl font-bold">
                {classInfo.teacherName.split(' ').pop().charAt(0)}
              </div>
              <div>
                <p className="text-xs text-blue-200 font-medium italic">Họ và tên</p>
                <p className="font-bold text-lg leading-tight">{detailInfo.teacherName}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-blue-200 font-medium mb-1 italic">Số điện thoại liên hệ</p>
              <p className="font-bold flex items-center gap-2 text-lg">
                <Phone size={18} className="text-green-400" /> {detailInfo.teacherPhone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 2: DANH SÁCH SINH VIÊN TRONG LỚP HỌC PHẦN (MỚI) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-[#3B5998]" /> Danh sách sinh viên lớp học phần
            </h3>
            <p className="text-xs text-gray-400 mt-1">Tổng cộng: {students.length} sinh viên</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Thanh tìm kiếm SV */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text"
                placeholder="Tìm mã SV, tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-[#3B5998]/10 transition-all"
              />
            </div>
            {/* Nút thao tác */}
            {user?.vaitro !== 'truongbomon' && user?.vaitro !== 'lanhdao' && (
              <>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-2 bg-green-50 text-green-600 rounded-xl border border-green-100 hover:bg-green-100 transition-colors shadow-sm"
                  title="Import Excel"
                >
                  <FileSpreadsheet size={20} />
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3B5998] text-white rounded-xl hover:bg-[#2e4676] transition-all shadow-md text-sm font-bold"
                >
                  <Plus size={18} /> Thêm SV từ lớp hành chính
                </button>
                <button
                  onClick={() => setIsSearchAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#3B5998] text-[#3B5998] rounded-xl hover:bg-[#3B5998]/5 transition-all shadow-sm text-sm font-bold"
                >
                  <Plus size={18} /> Thêm sinh viên
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bảng Sinh viên */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-16">STT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mã Sinh Viên</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Họ và Tên</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lớp hành chính</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày sinh</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
                  {user?.vaitro !== 'truongbomon' && user?.vaitro !== 'lanhdao' ? 'Thao tác' : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center">
                    <Loader2 className="animate-spin text-[#3B5998] mx-auto" />
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((sv, idx) => (
                  <tr key={sv.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-500 text-center font-medium">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#3B5998] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                        {sv.ma_sv}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700">{sv.ten}</span>
                    </td>
                     <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700">{sv.ten_lop_hc}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sv.ngaysinh ? new Date(sv.ngaysinh).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600 font-medium">{sv.email}</span>
                        <span className="text-[11px] text-gray-400">{sv.sdt}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user?.vaitro !== 'truongbomon' && user?.vaitro !== 'lanhdao' && (
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteClick(sv)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Gỡ khỏi lớp học phần"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-gray-400 text-sm italic">
                    Chưa có sinh viên nào trong lớp học phần này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <AddStudentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleAddStudent}
        classId={classInfo.id}
        adminClasses={adminClassOptions}
        isSubmitting={isAddStudentSubmitting}
        title="Thêm sinh viên từ lớp hành chính"
        description="Chọn lớp hành chính rồi tick sinh viên cần thêm vào lớp học phần."
      />

      <AddStudentModal
        isOpen={isSearchAddModalOpen}
        onClose={() => setIsSearchAddModalOpen(false)}
        onSave={handleAddStudent}
        classId={classInfo.id}
        adminClasses={allAdminClasses}
        isSubmitting={isAddStudentSubmitting}
        title="Thêm sinh viên từ lớp khác"
        description="Chọn lớp hành chính bất kỳ rồi tick sinh viên cần thêm vào lớp học phần."
      />

      <ImportStudentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportStudent}
        classId={classInfo.id}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleConfirmDelete}
        studentName={selectedStudent?.ten}
        title="Xác nhận gỡ sinh viên khỏi lớp học phần"
        description={`Bạn có chắc chắn muốn gỡ sinh viên ${selectedStudent?.ten || ''} khỏi lớp học phần này không?`}
        warningMessage="Lưu ý: Khi gỡ sinh viên khỏi lớp học phần, toàn bộ dữ liệu điểm danh của sinh viên đó trong lớp học phần này cũng sẽ bị xóa và không thể hoàn tác."
        confirmLabel="Gỡ khỏi lớp học phần"
      />

      {isEditClassModalOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#3B5998]">Sửa thông tin lớp học phần</h3>
              <button
                onClick={() => setIsEditClassModalOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                disabled={isSavingClassInfo}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClassInfo} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tên lớp học phần</label>
                  <input
                    type="text"
                    value={classForm.ten_lophocphan}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, ten_lophocphan: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Lớp hành chính</label>
                  <div className="mt-1 border border-gray-200 rounded-lg p-2.5 space-y-2">
                    {classForm.selected_admin_class_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {classForm.selected_admin_class_ids.map((adminClassId) => {
                          const selectedClass = allAdminClasses.find((item) => item.id === adminClassId);
                          const label = selectedClass?.name || adminClassId;
                          return (
                          <span
                            key={adminClassId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[#3B5998] text-xs font-semibold"
                          >
                            {label}
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminClass(adminClassId)}
                              className="text-[#3B5998]/70 hover:text-red-600"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        )})}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Chưa chọn lớp hành chính nào</p>
                    )}

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={classForm.admin_class_search}
                        onChange={(e) => setClassForm((prev) => ({ ...prev, admin_class_search: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                        placeholder="Tìm lớp hành chính để chọn..."
                      />

                      <div className="max-h-28 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                        {filteredAdminClassOptions.length > 0 ? (
                          filteredAdminClassOptions.map((item) => {
                            const selected = classForm.selected_admin_class_ids.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectAdminClass(item.id)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${selected ? 'bg-blue-50 text-[#3B5998] font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                              >
                                {item.name}
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy lớp hành chính phù hợp</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Phòng</label>
                  <input
                    type="text"
                    value={classForm.phong}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, phong: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Thứ</label>
                  <input
                    type="number"
                    min="2"
                    max="8"
                    value={classForm.thu}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, thu: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tiết bắt đầu</label>
                  <input
                    type="number"
                    min="1"
                    value={classForm.tiet_bat_dau}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, tiet_bat_dau: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Số tiết</label>
                  <input
                    type="number"
                    min="1"
                    value={classForm.so_tiet}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, so_tiet: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tuần học</label>
                  <input
                    type="text"
                    value={classForm.tuan_hoc}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, tuan_hoc: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                    placeholder="Ví dụ: 1,2,3,4,5"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Loại học phần</label>
                  <select
                    value={classForm.loai_hoc_phan}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, loai_hoc_phan: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                  >
                    <option value="LT">LT</option>
                    <option value="TH">TH</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditClassModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                  disabled={isSavingClassInfo}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingClassInfo}
                  className="px-4 py-2 text-sm font-semibold bg-[#3B5998] text-white rounded-lg hover:bg-[#2d4373] disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {isSavingClassInfo ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSavingClassInfo ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {saveNotice && (
        <div className="fixed top-4 right-4 z-[10001]">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-semibold border ${
              saveNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {saveNotice.text}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetailView;
