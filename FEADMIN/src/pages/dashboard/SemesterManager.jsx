'use strict';
import React, { useState, useEffect, useMemo } from 'react';
import SemesterToolbar from '../../components/semester/SemesterToolbar';
import SemesterTable from '../../components/semester/SemesterTable';
import SemesterModal from '../../components/semester/SemesterModal';
import hocKyService from '../../service/hockyService';

const SemesterManagerPage = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, data: null });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await hocKyService.getAll();
      // Xử lý cả 2 trường hợp response từ axios
      const listData = res.data?.data || res.data || [];
      if (Array.isArray(listData)) {
        setSemesters(listData);
      }
    } catch (err) {
      console.error("Lỗi API học kỳ:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => 
    semesters.filter(s => s.ten_hocky?.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm, semesters]
  );

  const handleDelete = async (id) => {
    if(window.confirm("Cảnh báo: Bạn chỉ có thể xóa học kỳ chưa có dữ liệu giảng dạy. Tiếp tục?")) {
      try {
        await hocKyService.delete(id);
        fetchData();
      } catch (err) { 
        alert(err.response?.data?.message || "Xóa thất bại"); 
      }
    }
  };

  return (
    <div className="p-8 bg-[#F8F9FA] min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý học kỳ</h1>
        <p className="text-gray-500 text-sm font-medium">Hệ thống đồng bộ Thứ 2 mốc tuần 1 cho lịch giảng dạy.</p>
      </div>

      <SemesterToolbar 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        onAddClick={() => setModalState({ isOpen: true, data: null })}
      />

      <SemesterTable 
        data={filteredData} 
        loading={loading}
        onEdit={(item) => setModalState({ isOpen: true, data: item })}
        onDelete={handleDelete}
      />

      {modalState.isOpen && (
        <SemesterModal 
          initialData={modalState.data}
          onClose={() => setModalState({ isOpen: false, data: null })}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default SemesterManagerPage;