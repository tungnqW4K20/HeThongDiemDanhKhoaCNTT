import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';

const SearchableSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Chọn...',
  disabled = false,
  isLoading = false,
  required = false,
  menuZIndexClass = 'z-50'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    const labelText = opt.label ? String(opt.label) : '';
    return labelText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`
          w-full px-3 py-2 border rounded-lg flex items-center justify-between bg-white transition-all
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-[#3B5998]'}
          ${isOpen ? 'ring-1 ring-[#3B5998] border-[#3B5998]' : 'border-gray-300'}
        `}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
      >
        <span className={`text-sm ${selectedOption ? 'text-gray-900' : 'text-gray-400'} truncate`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {isLoading ? (
          <Loader2 className="animate-spin text-gray-400 shrink-0" size={16} />
        ) : (
          <ChevronDown className={`text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} size={16} />
        )}
      </div>

      {isOpen && !disabled && (
        <div className={`absolute ${menuZIndexClass} w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 flex flex-col`}>
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-lg">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#3B5998]"
                placeholder="Nhập để tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`
                    px-3 py-2 text-sm rounded-md cursor-pointer flex items-center justify-between
                    ${opt.value === value ? 'bg-[#3B5998]/10 text-[#3B5998] font-medium' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check size={14} className="shrink-0 ml-2" />}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-xs">
                Không tìm thấy dữ liệu "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
