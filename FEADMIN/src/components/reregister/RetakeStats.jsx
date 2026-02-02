import React from 'react';
import { BookOpen, Users, DollarSign, Calendar } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-[#3B5998] flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-[#3B5998] mt-1">{value}</h3>
    </div>
    <div className="p-3 bg-blue-50 rounded-full">
      <Icon className="w-6 h-6 text-[#3B5998]" />
    </div>
  </div>
);

const RetakeStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard title="Lớp đang mở" value="12" icon={BookOpen} />
      <StatCard title="SV đăng ký" value="486" icon={Users} />
      <StatCard title="Học phần chờ" value="5" icon={Calendar} />
      <StatCard title="Tổng doanh thu (Tạm tính)" value="1.2 Tỷ" icon={DollarSign} />
    </div>
  );
};

export default RetakeStats;