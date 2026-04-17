import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle } from 'lucide-react';
import namHocService from '../../service/namHocService';

const SchoolYearModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    ten_namhoc: '',
    ngay_batdau: '',
    ngay_ketthuc: '',
    hk1_tuan_bat_dau_co_lich: 1,
    hk2_tuan_bat_dau_co_lich: 23
  });

  const validate = () => {
    const newErrors = {};

    if (!formData.ten_namhoc.trim()) {
      newErrors.ten_namhoc = 'Vui lòng nhập tên năm học';
    }

    if (!formData.ngay_batdau) {
      newErrors.ngay_batdau = 'Vui lòng chọn ngày bắt đầu';
    }

    if (!formData.ngay_ketthuc) {
      newErrors.ngay_ketthuc = 'Vui lòng chọn ngày kết thúc';
    }

    if (formData.ngay_batdau && formData.ngay_ketthuc) {
      const start = new Date(formData.ngay_batdau);
      const end = new Date(formData.ngay_ketthuc);
      if (start >= end) {
        newErrors.ngay_ketthuc = 'Ngày kết thúc phải lớn hơn ngày bắt đầu';
      }
    }

    if (!Number.isInteger(Number(formData.hk1_tuan_bat_dau_co_lich)) || Number(formData.hk1_tuan_bat_dau_co_lich) < 1 || Number(formData.hk1_tuan_bat_dau_co_lich) > 22) {
      newErrors.hk1_tuan_bat_dau_co_lich = 'Kỳ 1 phải trong khoảng tuần 1-22';
    }

    if (!Number.isInteger(Number(formData.hk2_tuan_bat_dau_co_lich)) || Number(formData.hk2_tuan_bat_dau_co_lich) < 23 || Number(formData.hk2_tuan_bat_dau_co_lich) > 46) {
      newErrors.hk2_tuan_bat_dau_co_lich = 'Kỳ 2 phải trong khoảng tuần 23-46';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        hk1_tuan_bat_dau_co_lich: Number(formData.hk1_tuan_bat_dau_co_lich),
        hk2_tuan_bat_dau_co_lich: Number(formData.hk2_tuan_bat_dau_co_lich)
      };

      await namHocService.create(payload);
      onSuccess();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi tạo năm học.';
      setErrors({ api: msg });
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Tạo năm học mới</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.api && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {errors.api}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên năm học *</label>
            <input
              type="text"
              placeholder="VD: 2026 - 2027"
              className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all ${
                errors.ten_namhoc ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
              }`}
              value={formData.ten_namhoc}
              onChange={(e) => setFormData({ ...formData, ten_namhoc: e.target.value })}
            />
            {errors.ten_namhoc && <p className="mt-1.5 text-xs text-red-500">{errors.ten_namhoc}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày bắt đầu *</label>
              <input
                type="date"
                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all ${
                  errors.ngay_batdau ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
                }`}
                value={formData.ngay_batdau}
                onChange={(e) => setFormData({ ...formData, ngay_batdau: e.target.value })}
              />
              {errors.ngay_batdau && <p className="mt-1.5 text-xs text-red-500">{errors.ngay_batdau}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày kết thúc *</label>
              <input
                type="date"
                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all ${
                  errors.ngay_ketthuc ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
                }`}
                value={formData.ngay_ketthuc}
                onChange={(e) => setFormData({ ...formData, ngay_ketthuc: e.target.value })}
              />
              {errors.ngay_ketthuc && <p className="mt-1.5 text-xs text-red-500">{errors.ngay_ketthuc}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <h4 className="text-sm font-bold text-[#3B5998]">Cấu hình tuần bắt đầu lịch dạy</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kỳ 1 (tuần 1-22)</label>
                <input
                  type="number"
                  min="1"
                  max="22"
                  className={`w-full px-3 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.hk1_tuan_bat_dau_co_lich ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
                  }`}
                  value={formData.hk1_tuan_bat_dau_co_lich}
                  onChange={(e) => setFormData({ ...formData, hk1_tuan_bat_dau_co_lich: e.target.value })}
                />
                {errors.hk1_tuan_bat_dau_co_lich && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.hk1_tuan_bat_dau_co_lich}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kỳ 2 (tuần 23-46)</label>
                <input
                  type="number"
                  min="23"
                  max="46"
                  className={`w-full px-3 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.hk2_tuan_bat_dau_co_lich ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
                  }`}
                  value={formData.hk2_tuan_bat_dau_co_lich}
                  onChange={(e) => setFormData({ ...formData, hk2_tuan_bat_dau_co_lich: e.target.value })}
                />
                {errors.hk2_tuan_bat_dau_co_lich && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.hk2_tuan_bat_dau_co_lich}</p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              Sau khi tạo năm học, hệ thống sẽ tự sinh 2 học kỳ theo mô hình 46 tuần.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-[#3B5998] hover:bg-[#2e4676] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} /> Tạo năm học
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SchoolYearModal;
