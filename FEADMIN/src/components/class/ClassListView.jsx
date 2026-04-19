import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, Briefcase, BookOpen, ChevronRight, MapPin, Upload } from 'lucide-react';
import Badge from './Badge'; 
import AddClassModal from './AddClassModal';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../Pagination'; 

const ClassListView = ({ data, onSelect, onAddClass, onImportClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // State Filters
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedCampus, setSelectedCampus] = useState(''); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 1. Unique Departments
  const uniqueDepartments = useMemo(() => {
    return [...new Set(data.map(item => item.department))].filter(Boolean).sort();
  }, [data]);

  // 2. Unique Majors
  const uniqueMajors = useMemo(() => {
    const filteredByDept = selectedDepartment 
      ? data.filter(item => item.department === selectedDepartment) 
      : data;
    return [...new Set(filteredByDept.map(item => item.majorName))].filter(Boolean).sort();
  }, [data, selectedDepartment]);

  // 3. Unique Campuses
  const uniqueCampuses = useMemo(() => {
    return [...new Set(data.map(item => item.campus))].filter(Boolean).sort();
  }, [data]);

  // 4. Logic lọc dữ liệu
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Vẫn giữ logic tìm kiếm theo GVCN dù không hiển thị cột, để user vẫn tìm được nếu nhớ tên
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.teacher.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = selectedDepartment ? item.department === selectedDepartment : true;
      const matchMajor = selectedMajor ? item.majorName === selectedMajor : true;
      const matchCampus = selectedCampus ? item.campus === selectedCampus : true;

      return matchSearch && matchDept && matchMajor && matchCampus;
    });
  }, [data, searchTerm, selectedDepartment, selectedMajor, selectedCampus]);

  
  const ITEMS_PER_PAGE = 5; 
  const { 
    currentData, 
    currentPage, 
    totalPages, 
    goToPage, 
    resetPagination 
  } = usePagination(filteredData, ITEMS_PER_PAGE);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, selectedDepartment, selectedMajor, selectedCampus, resetPagination]);


  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    setSelectedMajor('');
  };

  const clearFilters = () => {
    setSelectedDepartment('');
    setSelectedMajor('');
    setSelectedCampus(''); 
    setSearchTerm('');
  };

  const handleSaveClass = (newClassData) => {
    onAddClass(newClassData);
    setIsAddModalOpen(false);
  };

  return (
    <>
      <AddClassModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveClass}
      />
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all">
        {/* --- HEADER TOOLBAR --- */}
        <div className="p-5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white">
          {/* Search Input */}
          <div className="relative group w-full xl:max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#3B5998] transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm lớp..." 
                className="pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] w-full transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto xl:justify-end">
                {/* Filter Toggle Button */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 border rounded-lg transition-colors ${showFilters ? 'bg-blue-50 border-[#3B5998] text-[#3B5998]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                  title="Bộ lọc nâng cao"
                >
                  <Filter size={18} />
                </button>

                {/* ======= NÚT IMPORT EXCEL ======= */}
                {onImportClick && (
                    <button 
                      onClick={onImportClick}
                      className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <Upload size={16} /> <span className="hidden sm:inline">Nhập Excel</span>
                    </button>
                )}

                {/* Add Button */}
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-[#3B5998] hover:bg-[#2e4676] text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  + Thêm lớp
                </button>
          </div>
        </div>

        {/* --- FILTER PANEL --- */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              
              {/* Filter Cơ sở */}
              <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cơ sở đào tạo</label>
                  <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select 
                          value={selectedCampus}
                          onChange={(e) => setSelectedCampus(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] bg-white appearance-none cursor-pointer"
                      >
                          <option value="">Tất cả Cơ sở</option>
                          {uniqueCampuses.map(cp => (
                              <option key={cp} value={cp}>{cp}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Filter Khoa */}
              <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Khoa / Viện</label>
                  <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select 
                          value={selectedDepartment}
                          onChange={handleDepartmentChange}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] bg-white appearance-none cursor-pointer"
                      >
                          <option value="">Tất cả các Khoa</option>
                          {uniqueDepartments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Filter Chuyên ngành (Vẫn giữ logic lọc dù không hiện cột) */}
              <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Chuyên ngành</label>
                  <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select 
                          value={selectedMajor}
                          onChange={(e) => setSelectedMajor(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] bg-white appearance-none cursor-pointer"
                      >
                          <option value="">Tất cả Chuyên ngành</option>
                          {uniqueMajors.map(major => (
                              <option key={major} value={major}>{major}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Clear Filter Button */}
              {(selectedDepartment || selectedMajor || selectedCampus || searchTerm) && (
                  <button 
                      onClick={clearFilters}
                      className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-1 h-[38px] whitespace-nowrap"
                  >
                      <X size={16} /> Xóa bộ lọc
                  </button>
              )}
            </div>
          </div>
        )}

        {/* --- DATA TABLE (ĐÃ CẬP NHẬT) --- */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#3B5998]/10 border-b border-[#3B5998]/10">
                {/* Tăng width cột 1 */}
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[35%]">Mã lớp / Khoa</th>
                {/* Sửa header cột 2: Bỏ Chuyên ngành */}
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[30%]">Niên khóa </th>
                {/* Đã xóa cột Giảng viên CN ở đây */}
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[20%] text-center">Sĩ số</th>
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase tracking-wider w-[15%] text-right">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.length > 0 ? (
                currentData.map((item) => (
                  <tr 
                    key={item.id} 
                    className="group hover:bg-[#3B5998]/5 transition-colors cursor-pointer"
                    onClick={() => onSelect(item)}
                  >
                    {/* Cột 1: Mã lớp & Khoa & Cơ sở */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#3B5998] text-base group-hover:text-[#2e4676] transition-colors">{item.name}</span>
                        <span className="text-xs text-gray-500 font-semibold line-clamp-1">{item.department}</span>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                            <MapPin size={10} />
                            <span>{item.campus}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Chỉ còn Niên khóa & Chương trình (Bỏ Chuyên ngành) */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-2">
                             <Badge type="gray">Khóa {item.year}</Badge>
                             {item.program && (
                                <span className="text-[10px] uppercase text-gray-500 font-bold border border-gray-200 px-1.5 py-0.5 rounded bg-gray-50">
                                  {item.program}
                                </span>
                             )}
                          </div>
                          {/* Đã xóa dòng hiển thị item.majorName */}
                      </div>
                    </td>

                    {/* Đã xóa Cột Giảng viên CN */}

                    {/* Cột 3: Sĩ số */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        {item.count} SV
                      </span>
                    </td>

                    {/* Cột 4: Tác vụ */}
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-[#3B5998] p-2 hover:bg-white rounded-full transition-all" title="Xem chi tiết">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  {/* Sửa colSpan từ 5 xuống 4 do đã xóa 1 cột */}
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic bg-gray-50/30">
                    <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-300" />
                        <span>Không tìm thấy lớp học nào phù hợp với bộ lọc.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- FOOTER PAGINATION --- */}
        <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredData.length}
        />
      </div>
    </>
  );
};

export default ClassListView;