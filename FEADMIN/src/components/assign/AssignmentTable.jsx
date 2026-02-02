import React from 'react';
import { Edit2, Trash2, BookOpen, Users, MapPin, Clock } from 'lucide-react';
const thuTrongTuan = [
  'Chủ nhật',
  'Thứ hai',
  'Thứ ba',
  'Thứ tư',
  'Thứ năm',
  'Thứ sáu',
  'Thứ bảy',
];

const AssignmentTable = ({ assignments, onEdit, onDelete }) => {
    console.log("assignments", assignments)
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[15%]">Thứ / Ngày</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[30%]">Môn học / Lớp</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[25%]">Giảng viên</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[20%]">Thời gian / Phòng</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[15%]">Thao tác</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
                {assignments.length > 0 ? (
                    assignments.map((item) => (
                        <tr key={item.buoi_id} className="hover:bg-blue-50/30 transition-colors group">
                            {/* Cột Ngày */}
                            <td className="px-6 py-4">
                                <div className="text-sm font-bold text-gray-900"> {thuTrongTuan[new Date(item.ngay).getDay()]}</div>
                                <div className="text-xs text-gray-500">{new Date(item.ngay).toLocaleDateString('vi-VN')}</div>
                            </td>

                            {/* Cột Môn học */}
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">
                                            {item.hinh_thuc}
                                        </span>
                                        <span className="font-bold text-gray-800 text-sm line-clamp-1">{item.ten_mon}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <Users size={12} />
                                        <span>Lớp: {item.cac_lop_hanh_chinh}</span>
                                    </div>
                                </div>
                            </td>

                            {/* Cột Giảng viên */}
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-700">{item.ten_giang_vien}</div>
                                {item.giang_vien_day_thay && (
                                    <div className="text-[11px] text-orange-600 bg-orange-50 w-fit px-1 rounded">
                                        Thay: {item.giang_vien_day_thay}
                                    </div>
                                )}
                            </td>

                            {/* Cột Lịch/Phòng */}
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                        <Clock size={14} className="text-[#3B5998]" />
                                        {item.tiet_hien_thi}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <MapPin size={14} />
                                        <span>Phòng: {item.phong}</span>
                                    </div>
                                </div>
                            </td>

                            {/* Cột Thao tác */}
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => onDelete(item)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="px-6 py-20 text-center">
                             <div className="flex flex-col items-center text-gray-400">
                                <BookOpen size={48} strokeWidth={1} className="mb-2" />
                                <p className="text-base font-medium">Tuần này không có lịch học</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentTable;