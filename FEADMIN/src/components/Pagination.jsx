import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems }) => {
  if (totalItems === 0) return null;

  const getVisiblePages = () => {
    const delta = 2; 
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 gap-4">
      <span>
        Hiển thị trang <span className="font-medium text-gray-900">{currentPage}</span> / {totalPages} 
        <span className="mx-2 text-gray-300">|</span> 
        Tổng <span className="font-medium text-gray-900">{totalItems}</span> bản ghi
      </span>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        {getVisiblePages().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`px-3 py-1 border rounded transition-colors ${
              page === currentPage
                ? 'border-[#3B5998] bg-white font-medium text-[#3B5998]'
                : page === '...'
                ? 'border-transparent cursor-default'
                : 'border-gray-200 hover:bg-white'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

