import React from 'react';
import { Clock, MapPin, CalendarDays } from 'lucide-react';

// Map Enum 'Mon', 'Tue'... sang Tiếng Việt
const DAY_MAP = {
  'Mon': 'Thứ 2',
  'Tue': 'Thứ 3',
  'Wed': 'Thứ 4',
  'Thu': 'Thứ 5',
  'Fri': 'Thứ 6',
  'Sat': 'Thứ 7',
  'Sun': 'CN'
};

const ScheduleBadge = ({ thu, gio_batdau, gio_ketthuc, phong }) => {
  if (!thu || !gio_batdau) return <span className="text-gray-400 italic text-xs">Chưa xếp lịch</span>;

  // Format Time: 07:00:00 -> 07:00
  const formatTime = (t) => t?.slice(0, 5) || '';

  return (
    <div className="flex flex-col gap-1 items-start">
      <div className="flex items-center gap-1.5 bg-blue-50 text-[#3B5998] px-2 py-0.5 rounded text-xs font-semibold border border-blue-100">
        <CalendarDays size={12} />
        {DAY_MAP[thu] || thu}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
        <div className="flex items-center gap-1" title="Thời gian">
          <Clock size={12} className="text-gray-400" />
          {formatTime(gio_batdau)} - {formatTime(gio_ketthuc)}
        </div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1" title="Phòng học">
          <MapPin size={12} className="text-gray-400" />
          {phong}
        </div>
      </div>
    </div>
  );
};

export default ScheduleBadge;

