import React from 'react';

const Avatar = ({ name, size = 'md' }) => {
  const initials = name ? name.split(' ').pop().charAt(0) : '?';
  const sizeClass = size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-xs';
  
  return (
    <div className={`${sizeClass} rounded-full bg-[#3B5998] text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-white`}>
      {initials}
    </div>
  );
};

export default Avatar;