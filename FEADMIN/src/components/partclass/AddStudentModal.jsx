import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Plus, Search, X } from 'lucide-react';
import hocPhanService from '../../service/lophocphanService';

const AddStudentModal = ({
  isOpen,
  onClose,
  onSave,
  classId,
  adminClasses = [],
  isSubmitting = false,
  title = 'Thêm sinh viên từ lớp hành chính',
  description = 'Chọn lớp hành chính rồi tick sinh viên cần thêm vào lớp học phần.'
}) => {
  const [selectedAdminClassId, setSelectedAdminClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [addingStudentId, setAddingStudentId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const defaultAdminClass = adminClasses?.[0]?.id || '';
    setSelectedAdminClassId(defaultAdminClass);
    setStudents([]);
    setSelectedStudentIds([]);
    setSearchTerm('');
  }, [isOpen, adminClasses]);

  useEffect(() => {
    const fetchStudentsByAdminClass = async () => {
      if (!isOpen || !classId || !selectedAdminClassId) {
        setStudents([]);
        setSelectedStudentIds([]);
        return;
      }

      setIsLoadingStudents(true);
      try {
        const res = await hocPhanService.getStudentsByAdminClass(classId, selectedAdminClassId);
        const list = Array.isArray(res?.data?.students) ? res.data.students : [];
        setStudents(list);
        setSelectedStudentIds([]);
      } catch (error) {
        console.error('Lỗi lấy sinh viên theo lớp hành chính:', error);
        setStudents([]);
        setSelectedStudentIds([]);
        alert(error?.response?.data?.message || 'Không thể tải danh sách sinh viên theo lớp hành chính');
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudentsByAdminClass();
  }, [isOpen, classId, selectedAdminClassId]);

  const filteredStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((sv) => {
      const ma = (sv.ma_sv || '').toLowerCase();
      const ten = (sv.ten || '').toLowerCase();
      return ma.includes(keyword) || ten.includes(keyword);
    });
  }, [students, searchTerm]);

  const availableStudents = useMemo(
    () => filteredStudents.filter((sv) => !sv.da_dang_ky),
    [filteredStudents]
  );

  const selectedCount = selectedStudentIds.length;

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      return [...prev, studentId];
    });
  };

  const handleToggleSelectAll = () => {
    const allAvailableIds = availableStudents.map((sv) => sv.sinhvien_id);
    if (allAvailableIds.length === 0) return;

    setSelectedStudentIds((prev) => {
      const allSelected = allAvailableIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !allAvailableIds.includes(id));
      }
      return [...new Set([...prev, ...allAvailableIds])];
    });
  };

  const handleSelectAll = () => {
    const allAvailableIds = availableStudents.map((sv) => sv.sinhvien_id);
    if (allAvailableIds.length === 0) return;
    setSelectedStudentIds((prev) => [...new Set([...prev, ...allAvailableIds])]);
  };

  const handleClearSelected = () => {
    setSelectedStudentIds([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAdminClassId) {
      alert('Vui lòng chọn lớp hành chính.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      alert('Vui lòng chọn ít nhất một sinh viên.');
      return;
    }

    onSave({
      lop_hanhchinh_id: selectedAdminClassId,
      sinhvien_ids: selectedStudentIds
    });
  };

  const handleAddSingleStudent = async (studentId) => {
    if (!selectedAdminClassId || !studentId) return;
    try {
      setAddingStudentId(studentId);
      await onSave({
        lop_hanhchinh_id: selectedAdminClassId,
        sinhvien_ids: [studentId],
        keepOpen: true
      });

      setStudents((prev) =>
        prev.map((sv) => (sv.sinhvien_id === studentId ? { ...sv, da_dang_ky: true } : sv))
      );
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    } finally {
      setAddingStudentId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="p-5 border-b border-gray-100 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lớp hành chính</label>
              <select
                value={selectedAdminClassId}
                onChange={(e) => setSelectedAdminClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
              >
                {adminClasses.length === 0 && <option value="">Không có lớp hành chính</option>}
                {adminClasses.map((lop) => (
                  <option key={lop.id} value={lop.id}>{lop.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã SV hoặc họ tên..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Đã chọn: <b>{selectedCount}</b> sinh viên</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-md border border-[#3B5998]/20 text-[#3B5998] font-semibold hover:bg-[#3B5998]/5 disabled:text-gray-300 disabled:border-gray-200 disabled:bg-white"
                  disabled={availableStudents.length === 0 || isLoadingStudents}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={handleClearSelected}
                  className="px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:text-gray-300"
                  disabled={selectedCount === 0}
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[#3B5998] font-semibold hover:underline disabled:text-gray-300 disabled:no-underline"
                  disabled={availableStudents.length === 0 || isLoadingStudents}
                >
                  Chọn/Bỏ tất cả đang hiển thị
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoadingStudents ? (
              <div className="py-10 flex items-center justify-center text-[#3B5998]">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 italic">Không có sinh viên phù hợp.</div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((sv) => {
                  const disabled = !!sv.da_dang_ky;
                  const checked = selectedStudentIds.includes(sv.sinhvien_id);
                  const isRowAdding = addingStudentId === sv.sinhvien_id;

                  return (
                    <label
                      key={sv.sinhvien_id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                        disabled ? 'border-gray-100 bg-gray-50' : 'border-gray-200 hover:border-[#3B5998]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleStudent(sv.sinhvien_id)}
                        disabled={disabled || isSubmitting || isRowAdding}
                        className="w-4 h-4 accent-[#3B5998]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {sv.ten} <span className="text-[#3B5998]">({sv.ma_sv})</span>
                        </p>
                        <p className="text-xs text-gray-500 truncate">{sv.email || 'Chưa có email'} | {sv.sdt || 'Chưa có SĐT'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {disabled ? (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                            Đã trong lớp học phần
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddSingleStudent(sv.sinhvien_id);
                            }}
                            disabled={isSubmitting || isRowAdding}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#3B5998] text-white hover:bg-[#2e4676] disabled:opacity-60 flex items-center gap-1"
                          >
                            {isRowAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            {isRowAdding ? 'Đang thêm' : 'Thêm'}
                          </button>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm disabled:opacity-60"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedCount === 0}
              className="px-4 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-sm flex items-center gap-2 text-sm disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isSubmitting ? 'Đang thêm...' : 'Thêm sinh viên đã chọn'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddStudentModal;