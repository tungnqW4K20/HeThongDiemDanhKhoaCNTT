import React from 'react';
import { Edit2, Trash2, Loader2 } from 'lucide-react';

const ChuyenNganhTable = ({ data, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="animate-spin text-[#3B5998] mb-3" size={40} />
        <p className="animate-pulse">Đang tải danh sách chuyên ngành...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-16">STT</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-40">Mã chuyên ngành</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider">Tên chuyên ngành</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider">Khoa quản lý</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider">Môn học thuộc chuyên ngành</th>
            <th className="px-6 py-4 font-bold text-[#3B5998] text-xs uppercase tracking-wider text-center w-32">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={item.chuyennganh_id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 text-gray-400 text-sm font-medium">{index + 1}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold font-mono border border-gray-200">
                    {item.ma_chuyennganh}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{item.ten_chuyennganh}</span>
                    <span className="text-xs text-gray-400 mt-0.5 truncate max-w-xs italic">
                      {item.mota || 'Chưa có mô tả'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-gray-700">{item.Khoa?.ten_khoa || 'Chưa gán khoa'}</div>
                  <div className="text-xs text-gray-400">{item.Khoa?.ma_khoa || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-gray-700">{item.so_luong_mon_hoc || 0} môn</div>
                  <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={(item.DanhSachMonHoc || []).map((mh) => mh.ten_mon).join(', ')}>
                    {(item.DanhSachMonHoc || []).slice(0, 3).map((mh) => mh.ten_mon).join(', ') || 'Chưa có môn học'}
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
                      title="Xóa chuyên ngành"
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
                Không tìm thấy dữ liệu chuyên ngành
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ChuyenNganhTable;
