import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw, Library, Loader2 } from 'lucide-react';
import khoaService from '../../service/khoaService';
import BoMonTable from '../../components/department/BoMonTable';
import BoMonModal from '../../components/department/BoMonModal';
import DeleteConfirmModal from '../../components/department/DeleteConfirmModal';

const BoMonManagerPage = () => {
  const [data, setData] = useState([]);
  const [khoaList, setKhoaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBoMon, setSelectedBoMon] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [boMonRes, khoaRes] = await Promise.all([
        khoaService.getAllBoMon(),
        khoaService.getAll()
      ]);

      const boMonOk = boMonRes && (boMonRes.errCode === 0 || boMonRes.success === true);
      const khoaOk = khoaRes && (khoaRes.errCode === 0 || khoaRes.success === true);

      setData(boMonOk ? (boMonRes.data || []) : []);
      setKhoaList(khoaOk ? (khoaRes.data || []) : []);
    } catch (error) {
      console.error('Lỗi fetch dữ liệu bộ môn:', error);
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
      item.TruongBoMon?.username?.toLowerCase().includes(normalized) ||
      `${item.TruongBoMon?.GiangVien?.ho || ''} ${item.TruongBoMon?.GiangVien?.ten || ''}`.trim().toLowerCase().includes(normalized) ||
      (item.DanhSachMonHoc || []).some((mh) => mh.ten_mon?.toLowerCase().includes(normalized) || mh.ma_mon?.toLowerCase().includes(normalized))
    );
  }, [data, searchTerm]);

  const handleConfirmDelete = async () => {
    try {
      const res = await khoaService.deleteBoMon(selectedBoMon.chuyennganh_id);
      if (res && res.errCode === 0) {
        setIsDeleteOpen(false);
        setSelectedBoMon(null);
        fetchData();
      } else {
        alert(res.message || 'Xóa bộ môn thất bại');
      }
    } catch {
      alert('Không thể xóa bộ môn này');
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý bộ môn</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các bộ môn/chuyên ngành trực thuộc khoa</p>
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
              setSelectedBoMon(null);
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[#3B5998] text-white rounded-lg flex items-center gap-2 hover:bg-[#2e4676] transition-all shadow-md font-bold text-sm"
          >
            <Plus size={20} /> Thêm Bộ môn
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo mã, tên bộ môn hoặc tên khoa..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
          <div className="flex items-center gap-2">
            <Library size={16} className="text-[#3B5998]" />
            <span>
              Tổng số: <b className="text-gray-800">{filteredData.length}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <BoMonTable
          data={filteredData}
          loading={loading}
          onEdit={(item) => {
            setSelectedBoMon(item);
            setIsModalOpen(true);
          }}
          onDelete={(item) => {
            setSelectedBoMon(item);
            setIsDeleteOpen(true);
          }}
        />
      </div>

      <BoMonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialData={selectedBoMon}
        khoaOptions={khoaList}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa bộ môn"
        message={`Bạn có chắc chắn muốn xóa bộ môn ${selectedBoMon?.ten_chuyennganh}?`}
      />

      {loading && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/90 px-5 py-3 text-[#3B5998] shadow-lg">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-semibold">Đang tải dữ liệu bộ môn...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoMonManagerPage;
