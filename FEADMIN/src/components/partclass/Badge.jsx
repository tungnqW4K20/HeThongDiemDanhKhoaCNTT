import React from 'react';

const Badge = ({ children, type = 'blue' }) => {
  const styles = {
    blue: 'bg-blue-50 text-[#3B5998] border-blue-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[type] || styles.blue}`}>
      {children}
    </span>
  );
};

export default Badge;