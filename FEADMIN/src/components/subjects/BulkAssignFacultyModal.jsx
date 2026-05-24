import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import khoaService from '../../service/khoaService';

const BulkAssignFacultyModal = ({ isOpen, onClose, onSave, subjects = [], initialSelectedIds = [] }) => {
  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubjectIds(initialSelectedIds);
      fetchFaculties();
    }
  }, [isOpen, initialSelectedIds]);

  const fetchFaculties = async () => {
    setLoadingFaculties(true);
    try {
      const res = await khoaService.getAll();
      const list = Array.isArray(res) ? res : (res.data || []);
      setFaculties(list);
      if (list.length > 0) {
        setSelectedFacultyId(list[0].khoa_id);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách khoa:', error);
    } finally {
      setLoadingFaculties(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter(
      (sub) =>
        sub.ten_mon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.ma_mon.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [subjects, searchTerm]);

  const isAllChecked = useMemo(() => {
    if (filteredSubjects.length === 0) return false;
    return filteredSubjects.every((sub) => selectedSubjectIds.includes(sub.monhoc_id));
  }, [filteredSubjects, selectedSubjectIds]);

  const handleToggleSelectAll = () => {
    if (isAllChecked) {
      // Bỏ chọn tất cả các môn đang hiển thị trong danh sách lọc
      const filteredIds = filteredSubjects.map((sub) => sub.monhoc_id);
      setSelectedSubjectIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Chọn tất cả các môn đang hiển thị trong danh sách lọc
      const filteredIds = filteredSubjects.map((sub) => sub.monhoc_id);
      setSelectedSubjectIds((prev) => {
        const unique = new Set([...prev, ...filteredIds]);
        return Array.from(unique);
      });
    }
  };

  const handleToggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedFacultyId) {
      alert('Vui lòng chọn Khoa đích');
      return;
    }
    if (selectedSubjectIds.length === 0) {
      alert('Vui lòng chọn ít nhất một môn học');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedFacultyId, selectedSubjectIds);
      onClose();
    } catch (error) {
      console.error('Lỗi khi lưu gán khoa:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              <CheckCircle className="text-[#3B5998]" size={22}/>
              Gán khoa hàng loạt cho Môn học
            </h3>
            <p className="text-xs text-gray-500 mt-1">Chọn khoa đích và chọn các môn học muốn gán vào khoa đó.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Step 1: Chọn Khoa đích */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              1. Chọn Khoa đích
            </label>
            {loadingFaculties ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" /> Đang tải danh sách khoa...
              </div>
            ) : (
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] text-sm bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <option value="">-- Chọn Khoa nhận môn --</option>
                {faculties.map((k) => (
                  <option key={k.khoa_id} value={k.khoa_id}>
                    {k.ten_khoa} ({k.ma_khoa})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Chọn Môn học */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                2. Chọn Môn học muốn gán ({selectedSubjectIds.length} đã chọn)
              </label>
              {filteredSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-semibold text-[#3B5998] hover:underline cursor-pointer"
                >
                  {isAllChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả dòng đang hiển thị'}
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400 group-focus-within:text-[#3B5998] transition-colors" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhanh môn học theo mã hoặc tên..."
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Scrollable list */}
            <div className="border border-gray-100 rounded-lg overflow-y-auto max-h-[300px] divide-y divide-gray-50 bg-gray-50/50">
              {filteredSubjects.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Không tìm thấy môn học nào khớp với từ khóa tìm kiếm.
                </div>
              ) : (
                filteredSubjects.map((sub) => {
                  const isChecked = selectedSubjectIds.includes(sub.monhoc_id);
                  return (
                    <label
                      key={sub.monhoc_id}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 cursor-pointer transition-colors text-sm
                        ${isChecked ? 'bg-blue-50/30' : ''}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSubject(sub.monhoc_id)}
                        className="rounded border-gray-300 text-[#3B5998] focus:ring-[#3B5998]"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-gray-800">{sub.ten_mon}</span>
                          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2">
                            {sub.ma_mon}
                          </span>
                        </div>
                        {sub.ten_khoa && (
                          <span className="text-xs text-gray-400 italic">
                            Khoa hiện tại: {sub.ten_khoa}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors text-sm cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFacultyId || selectedSubjectIds.length === 0 || isSaving}
            className={`px-6 py-2 bg-[#3B5998] text-white rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm transition-all cursor-pointer
              ${(!selectedFacultyId || selectedSubjectIds.length === 0 || isSaving) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2e4676] hover:shadow-md'}
            `}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            Cập nhật gán khoa
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default BulkAssignFacultyModal;
