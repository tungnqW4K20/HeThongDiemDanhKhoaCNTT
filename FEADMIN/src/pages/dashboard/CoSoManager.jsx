import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Search, RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react';
import cosoService from '../../service/cosoService';

const CoSoManagerPage = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ten_coso: '', dia_chi: '', mota: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await cosoService.getAll();
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
    } catch (error) {
      console.error('Loi tai danh sach co so:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ ten_coso: '', dia_chi: '', mota: '' });
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ ten_coso: '', dia_chi: '', mota: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      ten_coso: item?.ten_coso || '',
      dia_chi: item?.dia_chi || '',
      mota: item?.mota || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ten_coso = formData.ten_coso.trim();
    const dia_chi = formData.dia_chi.trim();
    const mota = formData.mota.trim();

    if (!ten_coso) {
      alert('Tên cơ sở không được để trống');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (editingItem?.coso_id) {
        res = await cosoService.update({
          coso_id: editingItem.coso_id,
          ten_coso,
          dia_chi,
          mota
        });
      } else {
        res = await cosoService.create({ ten_coso, dia_chi, mota });
      }

      if (res?.errCode === 0) {
        await fetchData();
        resetModal();
        return;
      }

      alert(res?.message || 'Không thể lưu cơ sở');
    } catch (error) {
      console.error('Loi luu co so:', error);
      alert(error?.response?.data?.message || 'Lỗi hệ thống khi lưu cơ sở');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!item?.coso_id) return;
    const ok = window.confirm(`Bạn có chắc muốn xóa cơ sở "${item.ten_coso}"?`);
    if (!ok) return;

    try {
      const res = await cosoService.delete(item.coso_id);
      if (res?.errCode === 0) {
        await fetchData();
      } else {
        alert(res?.message || 'Không thể xóa cơ sở');
      }
    } catch (error) {
      console.error('Loi xoa co so:', error);
      alert(error?.response?.data?.message || 'Lỗi hệ thống khi xóa cơ sở');
    }
  };

  const filtered = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) => {
      const ten = String(item.ten_coso || '').toLowerCase();
      const diaChi = String(item.dia_chi || '').toLowerCase();
      const mota = String(item.mota || '').toLowerCase();
      return ten.includes(keyword) || diaChi.includes(keyword) || mota.includes(keyword);
    });
  }, [items, searchTerm]);

  return (
    <div className="animate-in fade-in duration-500 text-slate-900">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý cơ sở đào tạo</h1>
          <p className="text-gray-500 mt-1 text-sm">Danh sách cơ sở đào tạo trong hệ thống.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2d4373] transition"
          >
            <Plus size={16} />
            Thêm cơ sở
          </button>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#3B5998] transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm transition-all"
              placeholder="Tìm theo tên cơ sở hoặc địa chỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="text-sm text-gray-500">
            Tổng: <span className="font-semibold text-gray-700">{filtered.length}</span> cơ sở
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">STT</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tên cơ sở</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Địa chỉ</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Mô tả</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-gray-500">
                    Không có cơ sở nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr key={item.coso_id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Building2 size={16} className="text-[#3B5998]" />
                        <span>{item.ten_coso || 'Chua cap nhat'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={16} className="text-gray-400" />
                        <span>{item.dia_chi || 'Chua cap nhat'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 max-w-[280px] truncate" title={item.mota || ''}>
                      {item.mota || 'Chưa cập nhật'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-1200 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingItem ? 'Cập nhật cơ sở đào tạo' : 'Thêm cơ sở đào tạo'}
              </h3>
              <button
                onClick={resetModal}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Tên cơ sở <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ten_coso}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ten_coso: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
                  placeholder="Nhập tên cơ sở"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={formData.dia_chi}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dia_chi: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm"
                  placeholder="Nhập địa chỉ cơ sở"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={formData.mota}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mota: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none text-sm min-h-[88px] resize-y"
                  placeholder="Nhập mô tả cơ sở đào tạo"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-[#3B5998] text-white rounded-lg hover:bg-[#2d4373] disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoSoManagerPage;
