import React from 'react';

const StatusBadge = ({ status, current, max }) => {
  if (status === 'full' || current >= max) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        Đã đầy ({current}/{max})
      </span>
    );
  }
  if (status === 'warning' || current >= max * 0.9) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
        Sắp đầy ({current}/{max})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      Mở ĐK ({current}/{max})
    </span>
  );
};

export default StatusBadge;

