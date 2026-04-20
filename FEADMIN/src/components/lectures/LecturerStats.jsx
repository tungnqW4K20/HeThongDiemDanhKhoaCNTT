import React from 'react';
import { Users, UserPlus, Mail } from 'lucide-react';

const LecturerStats = ({ totalLecturers, newThisMonth, emailActivatedPercent }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-[#3B5998] rounded-full">
          <Users size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tổng giảng viên</p>
          <p className="text-2xl font-bold text-gray-800">{totalLecturers}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-green-50 text-green-600 rounded-full">
          <UserPlus size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Mới tháng này</p>
          <p className="text-2xl font-bold text-gray-800">{newThisMonth}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
          <Mail size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Đã kích hoạt Email</p>
          <p className="text-2xl font-bold text-gray-800">{emailActivatedPercent}%</p>
        </div>
      </div>
    </div>
  );
};

export default LecturerStats;