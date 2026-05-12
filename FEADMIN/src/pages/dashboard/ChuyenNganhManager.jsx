import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import khoaService from '../../service/khoaService';
import ChuyenNganhTable from '../../components/department/ChuyenNganhTable';
import ChuyenNganhModal from '../../components/department/ChuyenNganhModal';
import DeleteConfirmModal from '../../components/department/DeleteConfirmModal';

const ChuyenNganhManagerPage = () => {
  const [data, setData] = useState([]);
  const [khoaList, setKhoaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedChuyenNganh, setSelectedChuyenNganh] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chuyenNganhRes, khoaRes] = await Promise.all([
        khoaService.getAllChuyenNganh(),
        khoaService.getAll()
      ]);

      const chuyenNganhOk = chuyenNganhRes && (chuyenNganhRes.errCode === 0 || chuyenNganhRes.success === true);
      const khoaOk = khoaRes && (khoaRes.errCode === 0 || khoaRes.success === true);

      setData(chuyenNganhOk ? (chuyenNganhRes.data || []) : []);
      setKhoaList(khoaOk ? (khoaRes.data || []) : []);
    } catch (error) {
      console.error('Loi fetch du lieu chuyen nganh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return data;

    return data.filter((item) =>
      item.ten_chuyennganh?.toLowerCase().includes(normalized) ||
      item.ma_chuyennganh?.toLowerCase().includes(normalized) ||
      item.Khoa?.ten_khoa?.toLowerCase().includes(normalized) ||
      (item.DanhSachMonHoc || []).some((mh) => mh.ten_mon?.toLowerCase().includes(normalized) || mh.ma_mon?.toLowerCase().includes(normalized))
    );
  }, [data, searchTerm]);

  const handleConfirmDelete = async () => {
    try {
      const res = await khoaService.deleteChuyenNganh(selectedChuyenNganh.chuyennganh_id);
      if (res && res.errCode === 0) {
        setIsDeleteOpen(false);
        setSelectedChuyenNganh(null);
        fetchData();
      } else {
        alert(res.message || 'Xoa chuyen nganh that bai');
      }
    } catch {
      alert('Khong the xoa chuyen nganh nay');
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý chuyên ngành</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các chuyên ngành trực thuộc khoa</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all shadow-sm"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setSelectedChuyenNganh(null);
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[#3B5998] text-white rounded-lg flex items-center gap-2 hover:bg-[#2e4676] transition-all shadow-md font-bold text-sm"
          >
            <Plus size={20} /> Thêm Chuyên ngành
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <ChuyenNganhTable
          data={filteredData}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onEdit={(item) => {
            setSelectedChuyenNganh(item);
            setIsModalOpen(true);
          }}
          onDelete={(item) => {
            setSelectedChuyenNganh(item);
            setIsDeleteOpen(true);
          }}
        />
      </div>

      <ChuyenNganhModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialData={selectedChuyenNganh}
        khoaOptions={khoaList}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa chuyên ngành"
        message={`Bạn có chắc chắn muốn xóa chuyên ngành ${selectedChuyenNganh?.ten_chuyennganh}?`}
      />
    </div>
  );
};

export default ChuyenNganhManagerPage;
