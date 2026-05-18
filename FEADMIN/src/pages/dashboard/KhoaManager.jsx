import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Layers, LayoutGrid } from 'lucide-react';
import khoaService from '../../service/khoaService';
import KhoaTable from '../../components/department/KhoaTable';
import KhoaModal from '../../components/department/KhoaModal';
import DeleteConfirmModal from '../../components/department/DeleteConfirmModal';

const KhoaManagerPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedKhoa, setSelectedKhoa] = useState(null);

  const fetchKhoas = async () => {
    setLoading(true);
    try {
      const res = await khoaService.getAll();
      if (res && res.errCode === 0) {
        setData(res.data || []);
      } else {
        console.error(res.message);
      }
    } catch (error) {
      console.error("Lỗi fetch dữ liệu khoa:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKhoas();
  }, []);

  const handleConfirmDelete = async () => {
    try {
      const res = await khoaService.delete(selectedKhoa.khoa_id);
      if (res && res.errCode === 0) {
        setIsDeleteOpen(false);
        fetchKhoas();
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert("Không thể xóa khoa này");
    }
  };

  const filteredData = data.filter(item => 
    item.ten_khoa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ma_khoa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500">
      {/* Breadcrumb & Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý viện - khoa</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách khoa và các đơn vị đào tạo trực thuộc</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchKhoas}
            className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all shadow-sm"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => { setSelectedKhoa(null); setIsModalOpen(true); }}
            className="px-5 py-2.5 bg-[#3B5998] text-white rounded-lg flex items-center gap-2 hover:bg-[#2e4676] transition-all shadow-md font-bold text-sm"
          >
            <Plus size={20} /> Thêm Khoa
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <KhoaTable 
          data={filteredData} 
          loading={loading} 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onEdit={(item) => { setSelectedKhoa(item); setIsModalOpen(true); }} 
          onDelete={(item) => { setSelectedKhoa(item); setIsDeleteOpen(true); }} 
        />
      </div>

      <KhoaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchKhoas}
        initialData={selectedKhoa}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa khoa"
        message={`Bạn có chắc chắn muốn xóa khoa ${selectedKhoa?.ten_khoa}? Toàn bộ dữ liệu liên quan sẽ bị ẩn.`}
      />
    </div>
  );
};

export default KhoaManagerPage;