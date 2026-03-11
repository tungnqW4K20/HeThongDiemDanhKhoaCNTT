import React from 'react';
import { Calendar, Clock, AlertCircle, Edit2, Trash2 } from 'lucide-react';

const SemesterTable = ({ data, loading, onEdit, onDelete }) => {
  if (!loading && (!data || data.length === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-20 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-200" />
        <p className="text-gray-400">Không có dữ liệu học kỳ nào được hiển thị.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 font-bold text-[#3B5998] text-xs uppercase tracking-widest">
              <th className="px-6 py-4">Tên học kỳ</th>
              <th className="px-6 py-4">Năm học</th>
              <th className="px-6 py-4">Thời gian thực tế</th>
              <th className="px-6 py-4">Thứ 2 Tuần 1 (Mốc)</th>
              <th className="px-6 py-4">Tuần bắt đầu lịch</th>
              <th className="px-6 py-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
               <tr><td colSpan="6" className="p-10 text-center">Đang tải...</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.hocky_id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5 font-bold text-slate-700">{item.ten_hocky}</td>
                  <td className="px-6 py-5 font-bold text-slate-700">{item.NamHoc?.ten_namhoc || 'N/A'}</td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {item.ngay_batdau} <span className="text-gray-300">→</span> {item.ngay_ketthuc}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-[#3B5998] font-bold">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-400" />
                      {item.ngay_monday_tuan_1}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600 text-center">
                    {item.tuan_bat_dau_co_lich 
                      ? <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">Tuần {item.tuan_bat_dau_co_lich}</span>
                      : <span className="text-gray-400 text-xs">Từ tuần 1</span>
                    }
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button>
                        <button onClick={() => onDelete(item.hocky_id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SemesterTable;