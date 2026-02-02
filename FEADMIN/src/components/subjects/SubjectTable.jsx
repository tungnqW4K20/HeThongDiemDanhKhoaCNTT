import React, { useState, useMemo, useEffect } from 'react';
import {
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Building2
} from 'lucide-react';

import CreditBadge from './CreditBadge';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../Pagination';

/* =========================================================
   CONFIG COLUMNS
========================================================= */
const COLUMNS = [
  { key: 'ma_mon', label: 'Mã môn', width: 'w-[12%]', sortable: true, align: 'left' },
  { key: 'ten_mon', label: 'Tên môn học', width: 'w-[23%]', sortable: true, align: 'left' },
  { key: 'ma_khoa', label: 'Khoa', width: 'w-[15%]', sortable: true, align: 'left' },
  { key: 'sotinchi', label: 'Số TC', width: 'w-[10%]', sortable: true, align: 'center' },
  { key: 'mota', label: 'Mô tả chi tiết', width: 'w-[25%]', sortable: false, align: 'left' },
  { key: 'actions', label: 'Chức năng', width: 'w-[15%]', sortable: false, align: 'center' }
];

/* =========================================================
   LOADING SKELETON
========================================================= */
const TableSkeleton = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-gray-100">
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2" /></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
        <td className="px-6 py-4 text-center"><div className="h-6 bg-gray-200 rounded w-8 mx-auto" /></td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex justify-center gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

/* =========================================================
   EMPTY STATE
========================================================= */
const EmptyState = () => (
  <tr>
    <td colSpan={COLUMNS.length + 1} className="px-6 py-16 text-center">
      <div className="flex flex-col items-center text-gray-400">
        <div className="bg-gray-50 p-4 rounded-full mb-3 ring-4 ring-gray-50">
          <Search size={32} />
        </div>
        <p className="text-base font-medium text-gray-700">Không tìm thấy dữ liệu</p>
        <p className="text-sm text-gray-500 mt-1">
          Thử thay đổi bộ lọc hoặc thêm môn học mới.
        </p>
      </div>
    </td>
  </tr>
);

/* =========================================================
   MAIN COMPONENT
========================================================= */
const SubjectTable = ({
  subjects = [],
  isLoading = false,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectionChange
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'ma_mon', direction: 'asc' });

  /* ================= SORT ================= */
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedSubjects = useMemo(() => {
    if (!subjects) return [];
    return [...subjects].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [subjects, sortConfig]);

  /* ================= PAGINATION ================= */
  const {
    currentData,
    currentPage,
    totalPages,
    goToPage,
    resetPagination
  } = usePagination(sortedSubjects, 10);

  useEffect(() => {
    resetPagination();
  }, [subjects]);

  /* ================= SELECTION ================= */
  const isAllSelected =
    sortedSubjects.length > 0 &&
    selectedIds.length === sortedSubjects.length;

  const handleSelectAll = (e) => {
    onSelectionChange?.(
      e.target.checked ? sortedSubjects.map(s => s.monhoc_id) : []
    );
  };

  const handleSelectRow = (id) => {
    onSelectionChange?.(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    );
  };

  /* ================= SORT ICON ================= */
  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <ArrowUpDown size={14} className="text-gray-300" />;

    return sortConfig.direction === 'asc'
      ? <ArrowUp size={14} className="text-[#3B5998]" />
      : <ArrowDown size={14} className="text-[#3B5998]" />;
  };

  /* ================= RENDER ================= */
  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          {/* ===== HEADER ===== */}
          <thead className="bg-[#3B5998]/5 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              {onSelectionChange && (
                <th className="w-[50px] px-4 py-4 text-center border-b border-[#3B5998]/20">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#3B5998] focus:ring-[#3B5998]"
                  />
                </th>
              )}

              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`
                    px-6 py-4 text-xs font-bold uppercase tracking-wide
                    text-[#3B5998] border-b border-[#3B5998]/20
                    ${col.width}
                    ${col.align === 'center' ? 'text-center' : 'text-left'}
                    ${col.sortable ? 'cursor-pointer hover:bg-[#3B5998]/10 transition-colors' : ''}
                  `}
                >
                  <div className={`flex items-center gap-2 ${col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.label}
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* ===== BODY ===== */}
          <tbody className="divide-y divide-gray-100">
            {isLoading ? <TableSkeleton /> :
              currentData.length ? currentData.map(subject => {
                const isSelected = selectedIds.includes(subject.monhoc_id);
                return (
                  <tr
                    key={subject.monhoc_id}
                    className={`group ${isSelected ? 'bg-blue-50/60' : 'hover:bg-[#3B5998]/5'}`}
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(subject.monhoc_id)}
                          className="rounded border-gray-300 text-[#3B5998]"
                        />
                      </td>
                    )}

                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-1 rounded">
                        {subject.ma_mon}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold group-hover:text-[#3B5998]">
                      {subject.ten_mon}
                    </td>

                    <td className="px-6 py-4">
                      {subject.ma_khoa ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 border rounded">
                          <Building2 size={12} />
                          {subject.ten_khoa || subject.ma_khoa}
                        </span>
                      ) : '—'}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <CreditBadge credits={subject.sotinchi} />
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {subject.mota || (
                        <span className="italic text-gray-300 flex items-center gap-1">
                          <AlertCircle size={12} /> Chưa có mô tả
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => onEdit(subject)} className="p-2 hover:text-[#3B5998]">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDelete(subject)} className="p-2 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : <EmptyState />}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedSubjects.length}
        onPageChange={goToPage}
      />
    </div>
  );
};

export default SubjectTable;
