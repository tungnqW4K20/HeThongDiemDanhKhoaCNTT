import React, { useState, useMemo, useEffect } from 'react';
import {
  Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Mail, Phone, Building2, KeyRound, CheckCircle2
} from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../Pagination';

const COLUMNS = [
  { key: 'ten', label: 'Họ và Tên', width: 'w-[35%]', sortable: true },
  { key: 'khoa', label: 'Khoa / Viện', width: 'w-[25%]', sortable: true },
  { key: 'contact', label: 'Liên hệ', width: 'w-[25%]', sortable: false },
  { key: 'actions', label: 'Tác vụ', width: 'w-[15%]', align: 'center', sortable: false }
];

const Avatar = ({ firstName }) => {
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '?';
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B5998] to-[#4c6cb3] text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white ring-1 ring-gray-100 shrink-0 select-none">
      {initial}
    </div>
  );
};

const TableSkeleton = ({ canManage }) => (
  <>
    {[...Array(5)].map((_, index) => (
      <tr key={index} className="animate-pulse border-b border-gray-100 last:border-0">
        {canManage && (
          <td className="p-4">
            <div className="h-4 w-4 bg-gray-200 rounded mx-auto" />
          </td>
        )}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gray-200 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-2/3" /></td>
        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full mb-1" /><div className="h-3 bg-gray-200 rounded w-1/2" /></td>
        {canManage && (
          <td className="px-4 py-3">
            <div className="flex justify-center gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-gray-200 rounded" />
            </div>
          </td>
        )}
      </tr>
    ))}
  </>
);

const LecturerTable = ({
  lecturers = [],
  isLoading = false,
  onEdit,
  onDelete,
  onCreateAccount,
  selectedIds = [],
  onSelectionChange,
  canManage = true
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'ten', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLecturers = useMemo(() => {
    if (!lecturers) return [];
    const sorted = [...lecturers];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let valA = '';
        let valB = '';

        if (sortConfig.key === 'ten') {
          valA = `${(a.ten || '').toLowerCase()}${(a.ho || '').toLowerCase()}`;
          valB = `${(b.ten || '').toLowerCase()}${(b.ho || '').toLowerCase()}`;
        } else if (sortConfig.key === 'khoa') {
          valA = (a.Khoa?.ten_khoa || '').toLowerCase();
          valB = (b.Khoa?.ten_khoa || '').toLowerCase();
        } else {
          valA = (a[sortConfig.key] || '').toString().toLowerCase();
          valB = (b[sortConfig.key] || '').toString().toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [lecturers, sortConfig]);

  const ITEMS_PER_PAGE = 5;
  const {
    currentData,
    currentPage,
    totalPages,
    goToPage,
    resetPagination
  } = usePagination(sortedLecturers, ITEMS_PER_PAGE);

  useEffect(() => {
    resetPagination();
  }, [lecturers, resetPagination]);

  const handleSelectAll = (e) => {
    if (!canManage || !onSelectionChange) return;
    onSelectionChange(e.target.checked ? sortedLecturers.map((l) => l.giangvien_id) : []);
  };

  const handleSelectRow = (id) => {
    if (!canManage || !onSelectionChange) return;
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelected);
  };

  const isAllSelected = canManage
    && sortedLecturers.length > 0
    && sortedLecturers.every((l) => selectedIds.includes(l.giangvien_id));

  const tableColumns = canManage
    ? COLUMNS
    : COLUMNS.filter((col) => col.key !== 'actions');

  return (
    <div className="w-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              {canManage && (
                <th scope="col" className="w-12 px-4 py-3.5 text-center border-b border-gray-200">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#3B5998] focus:ring-[#3B5998] w-4 h-4 cursor-pointer transition-all"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={isLoading || lecturers.length === 0}
                    />
                  </div>
                </th>
              )}

              {tableColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20 ${col.width}
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sortable ? 'cursor-pointer hover:bg-gray-100/80 hover:text-[#3B5998] transition-colors select-none' : ''}
                  `}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col">
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === 'asc'
                            ? <ArrowUp size={14} className="text-[#3B5998]" />
                            : <ArrowDown size={14} className="text-[#3B5998]" />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-300 opacity-50 group-hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <TableSkeleton canManage={canManage} />
            ) : currentData.length > 0 ? (
              currentData.map((gv) => {
                const isSelected = canManage && selectedIds.includes(gv.giangvien_id);
                return (
                  <tr
                    key={gv.giangvien_id}
                    className={`group transition-colors duration-150 ${isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'}`}
                  >
                    {canManage && (
                      <td className="w-12 px-4 py-3 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-[#3B5998] focus:ring-[#3B5998] w-4 h-4 cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectRow(gv.giangvien_id)}
                          />
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={gv.ten} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-gray-900 truncate" title={`${gv.ho} ${gv.ten}`}>
                            {gv.ho} {gv.ten}
                          </span>
                          <span className="text-xs text-gray-500 font-mono truncate">
                            {gv.ma_gv || '---'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Building2 size={15} className="text-gray-400 shrink-0" />
                        <span className="truncate max-w-[180px]" title={gv.Khoa?.ten_khoa}>
                          {gv.Khoa?.ten_khoa || 'Chưa phân công'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={gv.email}>
                            {gv.email || 'Chưa có email'}
                          </span>
                        </div>
                        {gv.sdt && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Phone size={13} className="text-gray-400 shrink-0" />
                            <span className="truncate">{gv.sdt}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {canManage && (
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(gv); }}
                            className="p-1.5 text-gray-500 hover:text-[#3B5998] hover:bg-blue-50 rounded transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          {onCreateAccount && (
                            gv.TaiKhoan?.taikhoan_id ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); onCreateAccount(gv); }}
                                className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-all"
                                title={`Đã có TK: ${gv.TaiKhoan.username} — Click để chỉnh sửa`}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); onCreateAccount(gv); }}
                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                                title="Tạo tài khoản"
                              >
                                <KeyRound size={16} />
                              </button>
                            )
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(gv); }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={tableColumns.length + (canManage ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                      <Search size={32} strokeWidth={1.5} />
                    </div>
                    <p className="text-base font-medium text-gray-600">Không tìm thấy giảng viên nào</p>
                    <p className="text-sm text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        totalItems={sortedLecturers.length}
      />
    </div>
  );
};

export default LecturerTable;
