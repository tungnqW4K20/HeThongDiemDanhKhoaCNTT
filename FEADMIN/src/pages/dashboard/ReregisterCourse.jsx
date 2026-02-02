import React, { useState } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import RetakeStats from '../../components/reregister/RetakeStats';
import RetakeTable from '../../components/reregister/RetakeTable';
import RetakeModal from '../../components/reregister/RetakeModal';


// Dữ liệu giả lập
const MOCK_DATA = [
  { id: 1, code: 'HL_INT302_01', name: 'Lập trình Web nâng cao', credits: 3, teacher: 'Nguyễn Văn A', registered: 45, capacity: 60, deadline: '2024-06-15', status: 'open' },
  { id: 2, code: 'HL_MAT101_02', name: 'Toán rời rạc', credits: 4, teacher: 'Trần Thị B', registered: 60, capacity: 60, deadline: '2024-06-10', status: 'closed' },
  { id: 3, code: 'HL_INT201_01', name: 'Cấu trúc dữ liệu', credits: 3, teacher: 'Lê Văn C', registered: 12, capacity: 50, deadline: '2024-06-20', status: 'open' },
];

const RetakeClassPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if(window.confirm('Bạn có chắc muốn xóa lớp học lại này không?')) {
      console.log("Deleted ID:", id);
      // Logic gọi API xóa ở đây
    }
  };

  const handleSubmit = (formData) => {
    console.log("Submitted Data:", formData);
    setIsModalOpen(false);
    // Logic gọi API thêm/sửa ở đây
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3B5998]">Quản lý Mở lớp Học lại</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các lớp học phần mở thêm cho sinh viên học cải thiện/học lại.</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-[#3B5998] text-[#3B5998] rounded bg-white hover:bg-blue-50 transition font-medium">
                <Download size={18} />
                Xuất Excel
            </button>
            <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 bg-[#3B5998] text-white rounded hover:bg-[#2d4373] transition shadow-md font-medium"
            >
                <Plus size={18} />
                Mở lớp mới
            </button>
        </div>
      </div>

      {/* 2. Stats Section */}
      <RetakeStats />

      {/* 3. Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text"
                    placeholder="Tìm theo mã lớp, tên môn..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative">
                <select className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-[#3B5998] text-gray-700 cursor-pointer">
                    <option value="all">Tất cả kỳ</option>
                    <option value="hk1">Học kỳ 1</option>
                    <option value="hk2">Học kỳ 2</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Đang mở
            <span className="w-3 h-3 rounded-full bg-red-500 ml-2"></span> Đã khóa
        </div>
      </div>

      {/* 4. Data Table Section */}
      <RetakeTable 
        data={MOCK_DATA} 
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 5. Modal Popup */}
      <RetakeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingItem}
      />
    </div>
  );
};

export default RetakeClassPage;