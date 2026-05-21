import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const THEME_COLOR = '#3B5998';

const StatusButton = ({ status, active, onClick, icon: Icon }) => {
  const configs = {
    present: { label: 'Có mặt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-500 text-white border-emerald-500' },
    absent: { label: 'Vắng', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', active: 'bg-rose-500 text-white border-rose-500' },
    late: { label: 'Muộn', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', active: 'bg-amber-500 text-white border-amber-500' },
    excused: { label: 'Phép', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100', active: 'bg-slate-600 text-white border-slate-600' },
  };
  const config = configs[status] || configs.present;
  
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all duration-200",
        active ? config.active : config.color
      )}
    >
      {config.label}
    </button>
  );
};

const AttendanceTable = ({ data, onUpdateStatus, onUpdateNote, onNotifyTeacher, notifiedStudents }) => {
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
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col items-center justify-center text-gray-400">
        <div className="bg-gray-50 p-6 rounded-full mb-4">
          <FileSpreadsheet size={48} className="opacity-20" />
        </div>
        <p className="font-bold">Chưa có dữ liệu sinh viên.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0 overflow-hidden">
      
      {/* Toolbar Tìm kiếm & Lọc */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo mã SV hoặc tên..." 
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] transition-all bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select 
              className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="present">Có mặt</option>
              <option value="absent">Vắng</option>
              <option value="late">Đi muộn</option>
              <option value="excused">Có phép</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bảng Dữ liệu */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[250px]">Sinh Viên</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Điểm danh nhanh</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ghi Chú</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-[120px]">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.map((row) => {
              const key = `${row.sinhvien_id}-${row.lophocphan_id}`;
              const isNotified = notifiedStudents?.has(key);
              return (
                <tr key={row.id} className={twMerge(
                  "hover:bg-slate-50/50 transition-colors group",
                  row.canh_bao && "bg-red-50/20 hover:bg-red-50/30"
                )}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                        {row.ten || row.ho_ten}
                        {row.canh_bao && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-black bg-red-100 text-red-600 rounded">
                            Cảnh báo ({row.so_buoi_vang}/{row.tong_so_buoi})
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5">{row.ma_sv}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusButton 
                        status="present" 
                        active={row.trangthai === 'present'} 
                        onClick={() => onUpdateStatus(row.sinhvien_id, 'present')} 
                      />
                      <StatusButton 
                        status="absent" 
                        active={row.trangthai === 'absent'} 
                        onClick={() => onUpdateStatus(row.sinhvien_id, 'absent')} 
                      />
                      <StatusButton 
                        status="late" 
                        active={row.trangthai === 'late'} 
                        onClick={() => onUpdateStatus(row.sinhvien_id, 'late')} 
                      />
                      <StatusButton 
                        status="excused" 
                        active={row.trangthai === 'excused'} 
                        onClick={() => onUpdateStatus(row.sinhvien_id, 'excused')} 
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative group/note">
                      <input 
                        type="text"
                        placeholder="Ghi chú..."
                        value={row.ghichu || ''}
                        onChange={(e) => onUpdateNote(row.sinhvien_id, e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-600 border-none border-b border-transparent hover:border-slate-200 focus:border-[#3B5998] focus:ring-0 px-0 py-1 transition-all outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {row.canh_bao ? (
                      <button
                        type="button"
                        onClick={() => onNotifyTeacher(row)}
                        disabled={isNotified}
                        className={twMerge(
                          "px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all shadow-sm",
                          isNotified
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-not-allowed"
                            : "bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200 active:scale-95 border border-red-600"
                        )}
                      >
                        {isNotified ? 'Đã gửi' : 'Báo GV'}
                      </button>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
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