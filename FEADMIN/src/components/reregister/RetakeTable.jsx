import React from 'react';
import { Edit, Trash2, MoreHorizontal, UserCheck } from 'lucide-react';

const RetakeTable = ({ data, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[#3B5998] border-b border-gray-200">
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider">Mã Lớp</th>
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider">Môn Học</th>
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider">TC</th>
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider">Đã ĐK/Tối đa</th>
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider">Hạn Đăng Ký</th>
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider">Trạng Thái</th>
              <th className="py-4 px-6 font-bold text-sm uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-blue-50/30 transition duration-150 group">
                <td className="py-4 px-6 text-gray-900 font-medium">{item.code}</td>
                <td className="py-4 px-6">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">Giảng viên: {item.teacher || 'Chưa phân công'}</p>
                </td>
                <td className="py-4 px-6 text-gray-600">{item.credits}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#3B5998] h-2 rounded-full" 
                        style={{ width: `${(item.registered / item.capacity) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{item.registered}/{item.capacity}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">{item.deadline}</td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'open' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {item.status === 'open' ? 'Đang nhận' : 'Đã chốt'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onEdit(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition" 
                      title="Chỉnh sửa"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-100 rounded transition"
                      title="Xóa lớp"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination đơn giản */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-500">Hiển thị 1-10 trên tổng số 45 bản ghi</span>
        <div className="flex gap-1">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Trước</button>
          <button className="px-3 py-1 bg-[#3B5998] text-white border border-[#3B5998] rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">2</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Sau</button>
        </div>
      </div>
    </div>
  );
};

export default RetakeTable;