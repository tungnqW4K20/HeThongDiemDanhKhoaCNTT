import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import hocPhanService from '../../service/lophocphanService';

const InlineSearchSelect = ({
  label,
  options = [],
  value,
  onChange,
  multiple = false,
  placeholder,
  disabled = false,
  isLoading = false,
  required = false
}) => {
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedOption = multiple
    ? null
    : options.find((opt) => opt.value === value) || null;
  const selectedValues = multiple && Array.isArray(value) ? value : [];
  const selectedCount = selectedValues.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(selectedOption?.label || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = options.filter((opt) => {
    const text = String(opt.label || '').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option) => {
    if (option.disabled) return;

    if (multiple) {
      const exists = selectedValues.includes(option.value);
      const nextValues = exists
        ? selectedValues.filter((item) => item !== option.value)
        : [...selectedValues, option.value];
      onChange(nextValues);
      return;
    }

    onChange(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className={`relative rounded-lg border ${isOpen ? 'border-[#3B5998] ring-1 ring-[#3B5998]/20' : 'border-gray-200'}`}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={
            isOpen
              ? searchTerm
              : multiple
              ? selectedCount > 0
                ? `Đã chọn ${selectedCount} sinh viên`
                : ''
              : selectedOption?.label || ''
          }
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setSearchTerm(multiple ? '' : selectedOption?.label || '');
            setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (!multiple && value) onChange('');
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2.5 rounded-lg outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10000 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  (multiple ? selectedValues.includes(opt.value) : opt.value === value)
                    ? 'text-[#3B5998] bg-[#3B5998]/5 font-medium'
                    : 'text-gray-700'
                }`}
                disabled={opt.disabled}
              >
                <div className="min-w-0 flex items-center gap-2">
                  {multiple && (
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(opt.value)}
                      readOnly
                      className="w-4 h-4 accent-[#3B5998]"
                    />
                  )}
                  <span className={`truncate ${opt.disabled ? 'text-gray-400' : ''}`}>{opt.label}</span>
                  {opt.rightBadge && (
                    <span className="shrink-0 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {opt.rightBadge}
                    </span>
                  )}
                </div>
                {!multiple && opt.value === value && <Check size={14} className="shrink-0" />}
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Không tìm thấy dữ liệu phù hợp</div>
          )}
        </div>
      )}
    </div>
  );
};

const AddStudentSearchModal = ({
  isOpen,
  onClose,
  onSave,
  classId,
  adminClasses = [],
  isSubmitting = false
}) => {
  const [selectedAdminClassId, setSelectedAdminClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedAdminClassId(adminClasses?.[0]?.id || '');
    setStudents([]);
    setSelectedStudentIds([]);
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
        console.error('Lỗi tải danh sách sinh viên:', error);
        setStudents([]);
        setSelectedStudentIds([]);
        alert(error?.response?.data?.message || 'Không thể tải danh sách sinh viên theo lớp hành chính.');
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudentsByAdminClass();
  }, [isOpen, classId, selectedAdminClassId]);

  const adminClassSelectOptions = useMemo(
    () =>
      adminClasses.map((lop) => ({
        value: lop.id,
        label: lop.name
      })),
    [adminClasses]
  );

  const studentSelectOptions = useMemo(
    () =>
      students.map((sv) => ({
        value: sv.sinhvien_id,
        label: `${sv.ma_sv || 'N/A'} - ${sv.ten || 'Chưa có tên'}`,
        rightBadge: sv.da_dang_ky ? 'Đã trong lớp học phần' : '',
        disabled: !!sv.da_dang_ky
      })),
    [students]
  );

  const selectedStudents = useMemo(
    () => students.filter((sv) => selectedStudentIds.includes(sv.sinhvien_id)),
    [students, selectedStudentIds]
  );

  const hasSelectedDuplicated = useMemo(
    () => selectedStudents.some((sv) => !!sv.da_dang_ky),
    [selectedStudents]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAdminClassId) {
      alert('Vui lòng chọn lớp hành chính.');
      return;
    }

    if (!selectedStudentIds.length) {
      alert('Vui lòng chọn ít nhất một sinh viên.');
      return;
    }

    if (hasSelectedDuplicated) {
      alert('Danh sách chọn có sinh viên đã nằm trong lớp học phần.');
      return;
    }

    await onSave({
      lop_hanhchinh_id: selectedAdminClassId,
      sinhvien_ids: selectedStudentIds
    });

    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[82vh] max-h-[92vh] overflow-visible flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Thêm sinh viên</h3>
            <p className="text-xs text-gray-500 mt-1">Chọn lớp hành chính và tìm sinh viên cần thêm vào lớp học phần.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
          <InlineSearchSelect
            label="Lớp hành chính"
            required={true}
            options={adminClassSelectOptions}
            value={selectedAdminClassId}
            onChange={setSelectedAdminClassId}
            placeholder="Tìm lớp hành chính..."
          />

          <InlineSearchSelect
            label="Sinh viên"
            required={true}
            options={studentSelectOptions}
            value={selectedStudentIds}
            onChange={setSelectedStudentIds}
            multiple={true}
            placeholder={selectedAdminClassId ? 'Tìm và chọn nhiều sinh viên theo mã/tên...' : 'Chọn lớp hành chính trước'}
            disabled={!selectedAdminClassId || isLoadingStudents}
            isLoading={isLoadingStudents}
          />

          <p className="text-xs text-gray-500">
            Đã chọn <span className="font-semibold text-[#3B5998]">{selectedStudentIds.length}</span> sinh viên.
          </p>

          {hasSelectedDuplicated && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-[12px] text-amber-700 font-medium">
              Danh sách chọn có sinh viên đã nằm trong lớp học phần.
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
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
              disabled={isSubmitting || !selectedStudentIds.length || hasSelectedDuplicated}
              className="px-4 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-sm flex items-center gap-2 text-sm disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isSubmitting ? 'Đang thêm...' : 'Thêm sinh viên'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddStudentSearchModal;
