import React, { useState, useMemo, useEffect } from 'react';
import { Search, Library, ChevronRight, Loader2 } from 'lucide-react';
import Badge from './Badge';
import Pagination from '../Pagination'; // Import component bạn vừa đưa

const ClassListView = ({ data, onSelect, onImportClick, isLoading, boMonOptions: externalBoMonOptions = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoMon, setSelectedBoMon] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Số bản ghi mỗi trang

  const boMonOptionsFromData = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      if (item.departmentId && item.departmentName) {
        map.set(item.departmentId, item.departmentName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const boMonOptions = externalBoMonOptions.length > 0 ? externalBoMonOptions : boMonOptionsFromData;

  // 1. Logic lọc dữ liệu theo Search Term
  const filteredData = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return data.filter(item => {
      const matchesSearch =
        item.subjectName.toLowerCase().includes(keyword) ||
        item.teacherName.toLowerCase().includes(keyword) ||
        item.adminClasses.some(lop => lop.toLowerCase().includes(keyword)) ||
        (item.facultyName || '').toLowerCase().includes(keyword);
      const matchesBoMon = selectedBoMon === 'all' || item.departmentId === selectedBoMon;
      return matchesSearch && matchesBoMon;
    });
  }, [data, searchTerm, selectedBoMon]);

  // 2. Tự động quay về trang 1 khi tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBoMon]);

  // 3. Tính toán dữ liệu cho trang hiện tại
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 flex flex-col xl:flex-row justify-between items-center gap-4 border-b border-gray-100">
        <div className="relative w-full xl:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm môn, giảng viên, lớp HC, khoa..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] transition-all text-sm"
          />
        </div>

        <div className="w-full xl:w-auto flex items-center gap-3 justify-end">
          <select
            value={selectedBoMon}
            onChange={(e) => setSelectedBoMon(e.target.value)}
            className="w-full sm:w-60 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998]"
          >
            <option value="all">Tất cả Bộ môn</option>
            {boMonOptions.map((bm) => (
              <option key={bm.id} value={bm.id}>{bm.name}</option>
            ))}
          </select>

          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500 whitespace-nowrap">
            <Library size={16} className="text-[#3B5998]" />
            <span>
              Tổng số: <b className="text-gray-800">{filteredData.length}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#3B5998]/5 border-b border-[#3B5998]/10">
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase w-[30%]">Môn học & Mã HP</th>
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase w-[25%]">Giảng viên phụ trách</th>
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase w-[25%]">Lớp hành chính cùng học</th>
                <th className="px-6 py-4 text-xs font-bold text-[#3B5998] uppercase text-center">Loại</th>
                <th className="px-6 py-4 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-[#3B5998]" size={32} />
                      <span className="text-sm text-gray-400 font-medium">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className="group hover:bg-blue-50/40 transition-colors cursor-pointer" onClick={() => onSelect(item)}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm group-hover:text-[#3B5998] transition-colors">{item.subjectName}</span>
                        <span className="text-[11px] text-[#3B5998] font-bold mt-1 uppercase bg-blue-50 px-2 py-0.5 rounded-md w-fit italic">
                          Mã HP: {item.subjectCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">{item.teacherName}</span>
                        <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          {item.teacherPhone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.adminClasses.map((lop, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold rounded shadow-sm group-hover:border-blue-200">
                            {lop}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge type={item.isPractical ? 'yellow' : 'blue'}>
                        {item.isPractical ? 'THỰC HÀNH' : 'LÝ THUYẾT'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-[#3B5998] group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-gray-400 text-sm italic">
                    Không tìm thấy lớp học phần nào phù hợp...
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredData.length}
        />
      </div>
    </div>
  );
};

export default ClassListView;