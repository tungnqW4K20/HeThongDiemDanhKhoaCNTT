import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import khoaService from '../../service/khoaService';

const defaultForm = {
  khoa_id: '',
  ma_chuyennganh: '',
  ten_chuyennganh: '',
  mota: ''
};

const ChuyenNganhModal = ({ isOpen, onClose, onSuccess, initialData, khoaOptions = [] }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  const isEdit = useMemo(() => Boolean(initialData?.chuyennganh_id), [initialData]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        khoa_id: initialData.khoa_id || '',
        ma_chuyennganh: initialData.ma_chuyennganh || '',
        ten_chuyennganh: initialData.ten_chuyennganh || '',
        mota: initialData.mota || ''
      });
    } else {
      setFormData(defaultForm);
    }
  }, [isOpen, initialData]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.khoa_id || !formData.ma_chuyennganh.trim() || !formData.ten_chuyennganh.trim()) {
      alert('Vui lòng nhập đầy đủ Khoa, Mã chuyên ngành và Tên chuyên ngành.');
      return;
    }

    setLoading(true);
    try {
      let res;
      const payload = {
        khoa_id: formData.khoa_id,
        ma_chuyennganh: formData.ma_chuyennganh.trim(),
        ten_chuyennganh: formData.ten_chuyennganh.trim(),
        mota: formData.mota?.trim() || ''
      };

      if (isEdit) {
        res = await khoaService.updateChuyenNganh({
          ...payload,
          chuyennganh_id: initialData.chuyennganh_id
        });
      } else {
        res = await khoaService.createChuyenNganh(payload);
      }

      if (res && (res.errCode === 0 || res.success === true)) {
        onClose();
        onSuccess?.();
      } else {
        alert(res?.message || 'Lưu chuyên ngành thất bại');
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Không thể lưu chuyên ngành');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-[#3B5998]">
            {isEdit ? 'Cập nhật chuyên ngành' : 'Thêm chuyên ngành'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Khoa</label>
            <select
              value={formData.khoa_id}
              onChange={(e) => handleChange('khoa_id', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20"
            >
              <option value="">Chọn khoa</option>
              {khoaOptions.map((khoa) => (
                <option key={khoa.khoa_id} value={khoa.khoa_id}>
                  {khoa.ten_khoa}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Mã chuyên ngành</label>
              <input
                value={formData.ma_chuyennganh}
                onChange={(e) => handleChange('ma_chuyennganh', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                placeholder="VD: CNPM"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tên chuyên ngành</label>
              <input
                value={formData.ten_chuyennganh}
                onChange={(e) => handleChange('ten_chuyennganh', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20"
                placeholder="VD: Công nghệ phần mềm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              value={formData.mota}
              onChange={(e) => handleChange('mota', e.target.value)}
              rows={3}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20"
              placeholder="Mô tả chuyên ngành (không bắt buộc)"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-[#3B5998] text-white hover:bg-[#2e4676] text-sm font-bold disabled:opacity-60"
            >
              {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChuyenNganhModal;
