import React from 'react';
import { Search, Plus, Filter } from 'lucide-react';

const SemesterToolbar = ({ searchTerm, setSearchTerm, onAddClick }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Tìm kiếm tên học kỳ..."
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white transition-all outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <Filter size={18} />
          <span>Lọc</span>
        </button>
        <button 
          onClick={onAddClick}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#3B5998] hover:bg-[#2d4373] text-white px-5 py-2 rounded-lg font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus size={20} />
          <span className="whitespace-nowrap">Thêm học kỳ</span>
        </button>
      </div>
    </div>
  );
};

export default SemesterToolbar;