import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import hocKyService from '../../service/hockyService';
import namHocService from '../../service/namHocService'; // Import service mới

const SemesterModal = ({ initialData, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]); // State lưu danh sách năm học
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    ten_hocky: '',
    ngay_batdau: '',
    ngay_ketthuc: '',
    ngay_monday_tuan_1: '',
    namhoc_id: '',
    tuan_bat_dau_co_lich: '' // Tuần bắt đầu có lịch dạy (tùy chọn)
  });

  // 1. Load danh sách năm học khi mở modal
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await namHocService.getAll();
        const data = res.data?.data || res.data || [];
        setYears(data);
      } catch (err) {
        console.error("Lỗi load năm học:", err);
      }
    };
    fetchYears();
  }, []);

  // 2. Load dữ liệu cũ nếu là Chỉnh sửa
  useEffect(() => {
    if (initialData) {
      setFormData({
        ten_hocky: initialData.ten_hocky || '',
        ngay_batdau: initialData.ngay_batdau || '',
        ngay_ketthuc: initialData.ngay_ketthuc || '',
        ngay_monday_tuan_1: initialData.ngay_monday_tuan_1 || '',
        namhoc_id: initialData.namhoc_id || '',
        tuan_bat_dau_co_lich: initialData.tuan_bat_dau_co_lich || ''
      });
    }
  }, [initialData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.namhoc_id) newErrors.namhoc_id = "Vui lòng chọn năm học";
    if (!formData.ten_hocky.trim()) newErrors.ten_hocky = "Tên học kỳ không được để trống";
    if (!formData.ngay_batdau) newErrors.ngay_batdau = "Vui lòng chọn ngày bắt đầu";
    if (!formData.ngay_ketthuc) newErrors.ngay_ketthuc = "Vui lòng chọn ngày kết thúc";
    if (!formData.ngay_monday_tuan_1) newErrors.ngay_monday_tuan_1 = "Vui lòng chỉ định ngày Thứ 2 mốc";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (initialData?.hocky_id) {
        await hocKyService.update(initialData.hocky_id, formData);
      } else {
        await hocKyService.create(formData);
      }
      onSuccess(); 
      onClose();   
    } catch (error) {
      const msg = error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.";
      setErrors({ api: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">
            {initialData ? 'Chỉnh sửa học kỳ' : 'Tạo học kỳ mới'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.api && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {errors.api}
            </div>
          )}

          {/* DROP DOWN CHỌN NĂM HỌC */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thuộc năm học *</label>
            <select
              className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center] ${
                errors.namhoc_id ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
              }`}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em' }}
              value={formData.namhoc_id}
              onChange={(e) => setFormData({...formData, namhoc_id: e.target.value})}
            >
              <option value="">-- Chọn năm học --</option>
              {years.map((y) => (
                <option key={y.namhoc_id} value={y.namhoc_id}>
                  Năm học {y.ten_namhoc}
                </option>
              ))}
            </select>
            {errors.namhoc_id && <p className="mt-1.5 text-xs text-red-500">{errors.namhoc_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên học kỳ *</label>
            <input
              type="text"
              placeholder="VD: Học kỳ 1"
              className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all ${
                errors.ten_hocky ? 'border-red-300' : 'border-gray-200 focus:border-[#3B5998]'
              }`}
              value={formData.ten_hocky}
              onChange={(e) => setFormData({...formData, ten_hocky: e.target.value})}
            />
            {errors.ten_hocky && <p className="mt-1.5 text-xs text-red-500">{errors.ten_hocky}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày bắt đầu</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#3B5998] outline-none"
                value={formData.ngay_batdau}
                onChange={(e) => setFormData({...formData, ngay_batdau: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày kết thúc</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#3B5998] outline-none"
                value={formData.ngay_ketthuc}
                onChange={(e) => setFormData({...formData, ngay_ketthuc: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#3B5998] mb-1.5 uppercase text-[10px] tracking-widest">
              Thứ 2 mốc tuần 1 (Cố định) *
            </label>
            <input
              type="date"
              className="w-full px-4 py-2.5 rounded-xl border border-[#3B5998]/30 bg-blue-50/20 focus:border-[#3B5998] outline-none"
              value={formData.ngay_monday_tuan_1}
              onChange={(e) => setFormData({...formData, ngay_monday_tuan_1: e.target.value})}
            />
            <p className="text-[10px] text-gray-400 mt-1 italic">Hệ thống dựa vào ngày này để tính số thứ tự tuần.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tuần bắt đầu có lịch dạy
              <span className="ml-2 text-[10px] font-normal text-gray-400">(Bỏ trống = từ tuần 1)</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="VD: 3 (lịch dạy bắt đầu từ tuần 3)"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#3B5998] outline-none"
              value={formData.tuan_bat_dau_co_lich}
              onChange={(e) => setFormData({...formData, tuan_bat_dau_co_lich: e.target.value ? Number(e.target.value) : null})}
            />
            <p className="text-[10px] text-gray-400 mt-1 italic">Chỉ định nếu lịch dạy không bắt đầu từ tuần đầu tiên của học kỳ.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-[#3B5998] hover:bg-[#2e4676] disabled:opacity-50 transition-colors">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save size={18} /> Lưu dữ liệu</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SemesterModal;