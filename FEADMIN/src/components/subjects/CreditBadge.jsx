import React from 'react';

const CreditBadge = ({ credits }) => {
  let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
  
  if (credits >= 4) colorClass = 'bg-orange-50 text-orange-700 border-orange-100';
  else if (credits >= 3) colorClass = 'bg-blue-50 text-[#3B5998] border-blue-100';
  else colorClass = 'bg-green-50 text-green-700 border-green-100';

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClass}`}>
      {credits} TC
    </span>
  );
};

export default CreditBadge;