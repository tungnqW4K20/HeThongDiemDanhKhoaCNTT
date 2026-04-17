import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle } from 'lucide-react';
import khoaService from '../../service/khoaService';

const KhoaModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    ma_khoa: '',
    ten_khoa: '',
    mota: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ma_khoa: initialData.ma_khoa || '',
        ten_khoa: initialData.ten_khoa || '',
        mota: initialData.mota || ''
      });
    } else {
      setFormData({ ma_khoa: '', ten_khoa: '', mota: '' });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      let res;
      if (initialData) {
        // Update: truyền thêm khoa_id vào body
        res = await khoaService.update({ ...formData, khoa_id: initialData.khoa_id });
      } else {
        res = await khoaService.create(formData);
      }

      if (res && res.errCode === 0) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="text-lg font-extrabold text-[#3B5998]">
            {initialData ? 'CẬP NHẬT KHOA' : 'THÊM KHOA MỚI'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mã Khoa</label>
            <input 
              required
              type="text"
              placeholder="VD: CNTT, KETOAN..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all font-bold"
              value={formData.ma_khoa}
              onChange={(e) => setFormData({...formData, ma_khoa: e.target.value.toUpperCase()})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tên Khoa</label>
            <input 
              required
              type="text"
              placeholder="VD: Công nghệ thông tin..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all"
              value={formData.ten_khoa}
              onChange={(e) => setFormData({...formData, ten_khoa: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mô tả ngắn</label>
            <textarea 
              rows="3"
              placeholder="Nhập mô tả về khoa..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all resize-none"
              value={formData.mota}
              onChange={(e) => setFormData({...formData, mota: e.target.value})}
            ></textarea>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-sm"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#3B5998] text-white rounded-xl font-bold hover:bg-[#2e4676] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Save size={18} />
              {submitting ? 'Đang xử lý...' : 'Lưu dữ liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default KhoaModal;