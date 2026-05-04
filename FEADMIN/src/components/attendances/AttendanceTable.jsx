import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const THEME_COLOR = '#3B5998';

const StatusBadge = ({ status }) => {
  const styles = {
    present: 'bg-green-100 text-green-700 border-green-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    excused: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const labels = { present: 'Có mặt', absent: 'Vắng', late: 'Đi muộn', excused: 'Có phép' };
  const normalizedStatus = status ? status.toLowerCase() : 'absent';

  return (
    <span className={twMerge(clsx("px-3 py-1 rounded-full text-xs font-semibold border", styles[normalizedStatus] || styles.absent))}>
      {labels[normalizedStatus] || status}
    </span>
  );
};

const AttendanceTable = ({ data, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Logic lọc dữ liệu
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const maSv = (item.ma_sv || '').toLowerCase();
      const tenSv = (item.ten || item.ho_ten || '').toLowerCase();
      const matchSearch = maSv.includes(searchTerm.toLowerCase()) || tenSv.includes(searchTerm.toLowerCase());
      const matchFilter = filterStatus === 'all' || (item.trangthai || '').toLowerCase() === filterStatus;
      return matchSearch && matchFilter;
    });
  }, [data, searchTerm, filterStatus]);

  // Trạng thái trống (Chưa có file)
  if (data.length === 0) {
    return (
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 h-[400px] flex flex-col items-center justify-center text-gray-400">
        <div className="bg-gray-50 p-6 rounded-full mb-4">
          <FileSpreadsheet size={48} className="opacity-20" />
        </div>
        <p>Chưa có dữ liệu điểm danh.</p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
      
      {/* Toolbar Tìm kiếm & Lọc */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm Mã SV hoặc Tên..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            className="bg-gray-50 border-none text-sm font-medium text-gray-600 rounded-lg py-2 pl-2 pr-8 focus:ring-0 cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="present">Có mặt</option>
            <option value="absent">Vắng</option>
            <option value="late">Đi muộn</option>
          </select>
        </div>
      </div>

      {/* Bảng Dữ liệu */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sinh Viên</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Trạng Thái</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi Chú</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{row.ten || row.ho_ten}</span>
                    <span className="text-xs text-gray-500 font-mono">{row.ma_sv}</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <StatusBadge status={row.trangthai} />
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {row.ghichu ? (
                    <span className="flex items-center gap-1 text-gray-700">
                      <AlertCircle size={14} className="text-orange-400" />
                      {row.ghichu}
                    </span>
                  ) : (
                    <span className="text-gray-300 italic">--</span>
                  )}
                </td>
                <td className="p-4 text-right">
                    <button 
                      onClick={() => onEdit && onEdit(row)}
                      className="text-xs font-medium hover:underline transition-opacity opacity-0 group-hover:opacity-100"
                      style={{ color: THEME_COLOR }}
                    >
                      Sửa
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Bảng */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center rounded-b-xl">
        <span>Hiển thị {filteredData.length} / {data.length} bản ghi</span>
        <span>Dữ liệu xem trước (Chưa lưu)</span>
      </div>
    </div>
  );
};

export default AttendanceTable;