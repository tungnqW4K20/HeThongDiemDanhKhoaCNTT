import React from 'react';
import { Edit2, Trash2, Loader2, BookOpen, GraduationCap, Search } from 'lucide-react';
import Badge from '../class/Badge';

const KhoaTable = ({ data, loading, onEdit, onDelete, searchTerm, setSearchTerm }) => {
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="animate-spin text-[#3B5998] mb-3" size={40} />
        <p className="animate-pulse">Đang tải danh sách khoa...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-100 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Tìm theo mã hoặc tên khoa..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3B5998]"></span>
            <span>Tổng số: <b className="text-gray-800">{data.length}</b></span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-16">STT</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-32">Mã Khoa</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider">Tên Khoa / Đơn vị</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider text-center">Chuyên ngành</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider text-center">Lớp hành chính</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider text-center w-32">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={item.khoa_id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 text-gray-400 text-sm font-medium">{index + 1}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold font-mono border border-gray-200">
                    {item.ma_khoa}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{item.ten_khoa}</span>
                    <span className="text-xs text-gray-400 mt-0.5 truncate max-w-xs italic">
                      {item.mota || "Chưa có mô tả"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-blue-600 bg-blue-50 py-1 px-3 rounded-full w-fit mx-auto">
                    <BookOpen size={14} />
                    <span className="text-sm font-bold">{item.DanhSachChuyenNganh?.length || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-orange-600 bg-orange-50 py-1 px-3 rounded-full w-fit mx-auto">
                    <GraduationCap size={14} />
                    <span className="text-sm font-bold">{item.DanhSachLopHanhChinh?.length || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => onEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Sửa thông tin"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(item)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Xóa khoa"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">
                Không tìm thấy dữ liệu khoa
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default KhoaTable;