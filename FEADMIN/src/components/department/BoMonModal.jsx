import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle, Search, Check, ChevronDown } from 'lucide-react';
import khoaService from '../../service/khoaService';
import monHocService from '../../service/monhocService';

const BoMonModal = ({ isOpen, onClose, onSuccess, initialData, khoaOptions = [] }) => {
  const [formData, setFormData] = useState({
    khoa_id: '',
    ma_chuyennganh: '',
    ten_chuyennganh: '',
    mota: '',
    truong_bomon_id: ''
  });
  const [truongBoMonOptions, setTruongBoMonOptions] = useState([]);
  const [monHocOptions, setMonHocOptions] = useState([]);
  const [selectedMonHocIds, setSelectedMonHocIds] = useState([]);
  const [showMonHocDropdown, setShowMonHocDropdown] = useState(false);
  const [monHocSearch, setMonHocSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const monHocDropdownRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        khoa_id: initialData.khoa_id || '',
        ma_chuyennganh: initialData.ma_chuyennganh || '',
        ten_chuyennganh: initialData.ten_chuyennganh || '',
        mota: initialData.mota || '',
        truong_bomon_id: initialData.TruongBoMon?.taikhoan_id || ''
      });
      setSelectedMonHocIds((initialData.DanhSachMonHoc || []).map((mh) => mh.monhoc_id));
    } else {
      setFormData({ khoa_id: '', ma_chuyennganh: '', ten_chuyennganh: '', mota: '', truong_bomon_id: '' });
      setSelectedMonHocIds([]);
    }
    setError('');
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!isOpen || !formData.khoa_id) {
        setTruongBoMonOptions([]);
        return;
      }

      try {
        const res = await khoaService.getTruongBoMonOptions(formData.khoa_id);
        setTruongBoMonOptions(res?.data || []);
      } catch {
        setTruongBoMonOptions([]);
      }
    };

    fetchOptions();
  }, [isOpen, formData.khoa_id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monHocDropdownRef.current && !monHocDropdownRef.current.contains(event.target)) {
        setShowMonHocDropdown(false);
      }
    };

    if (showMonHocDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonHocDropdown]);

  const toggleMonHoc = (monhocId) => {
    setSelectedMonHocIds((prev) => {
      if (prev.includes(monhocId)) {
        return prev.filter((id) => id !== monhocId);
      }
      return [...prev, monhocId];
    });
  };

  const selectedMonHocText = () => {
    if (selectedMonHocIds.length === 0) return '';
    const selectedMap = new Map(monHocOptions.map((item) => [item.monhoc_id, item]));
    return selectedMonHocIds
      .map((id) => selectedMap.get(id))
      .filter(Boolean)
      .map((mh) => `${mh.ma_mon ? `${mh.ma_mon} - ` : ''}${mh.ten_mon}`)
      .join(', ');
  };

  const filteredMonHocOptions = monHocOptions.filter((mh) => {
    if (!monHocSearch.trim()) return true;
    const keyword = monHocSearch.toLowerCase();
    return (
      mh.ten_mon?.toLowerCase().includes(keyword) ||
      mh.ma_mon?.toLowerCase().includes(keyword)
    );
  });

  const getMonHocBoMonInfo = (mh) => {
    const boMonId = mh?.BoMon?.chuyennganh_id || mh?.BoMon?.bomon_id || mh?.chuyennganh_id || mh?.bomon_id || null;
    const boMonName = mh?.BoMon?.ten_chuyennganh || mh?.BoMon?.ten_bomon || null;
    return { boMonId, boMonName };
  };

  const currentBoMonId = initialData?.chuyennganh_id || null;

  useEffect(() => {
    const fetchMonHocOptions = async () => {
      if (!isOpen) {
        setMonHocOptions([]);
        return;
      }

      try {
        const res = await monHocService.getAll();
        const allMonHoc = res?.data || [];
        const filteredByKhoa = formData.khoa_id
          ? allMonHoc.filter((mh) => !mh.khoa_id || mh.khoa_id === formData.khoa_id)
          : allMonHoc;
        setMonHocOptions(filteredByKhoa);
      } catch {
        setMonHocOptions([]);
      }
    };

    fetchMonHocOptions();
  }, [isOpen, formData.khoa_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      let res;
      const payload = {
        ...formData,
        truong_bomon_id: formData.truong_bomon_id || null,
        monhoc_ids: selectedMonHocIds
      };
      if (initialData) {
        res = await khoaService.updateBoMon({ ...payload, chuyennganh_id: initialData.chuyennganh_id });
      } else {
        res = await khoaService.createBoMon(payload);
      }

      if (res && res.errCode === 0) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[86vh] max-h-[760px] border border-gray-100 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="text-lg font-extrabold text-[#3B5998]">
            {initialData ? 'CẬP NHẬT BỘ MÔN' : 'THÊM BỘ MÔN MỚI'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Khoa</label>
            <select
              required
              value={formData.khoa_id}
              onChange={(e) => setFormData({ ...formData, khoa_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all"
            >
              <option value="">-- Chọn khoa --</option>
              {khoaOptions.map((khoa) => (
                <option key={khoa.khoa_id} value={khoa.khoa_id}>
                  {khoa.ten_khoa} ({khoa.ma_khoa})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mã Bộ môn</label>
            <input
              required
              type="text"
              placeholder="VD: KTPM, KHMT..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all font-bold"
              value={formData.ma_chuyennganh}
              onChange={(e) => setFormData({ ...formData, ma_chuyennganh: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tên Bộ môn</label>
            <input
              required
              type="text"
              placeholder="VD: Kỹ thuật phần mềm..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all"
              value={formData.ten_chuyennganh}
              onChange={(e) => setFormData({ ...formData, ten_chuyennganh: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mô tả ngắn</label>
            <textarea
              rows="3"
              placeholder="Nhập mô tả về bộ môn..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all resize-none"
              value={formData.mota}
              onChange={(e) => setFormData({ ...formData, mota: e.target.value })}
            ></textarea>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Trưởng bộ môn</label>
            <select
              value={formData.truong_bomon_id}
              onChange={(e) => setFormData({ ...formData, truong_bomon_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] outline-none transition-all"
            >
              <option value="">-- Chưa phân công --</option>
              {truongBoMonOptions.map((item) => (
                <option
                  key={item.taikhoan_id || item.giangvien_id}
                  value={item.taikhoan_id || ''}
                  disabled={!item.has_account}
                >
                  {`${item.ho || ''} ${item.ten || ''}`.trim()} {item.ma_gv ? `(${item.ma_gv})` : ''}{!item.has_account ? ' - chưa có tài khoản' : ''}
                </option>
              ))}
            </select>
            {truongBoMonOptions.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Chưa có giảng viên thuộc khoa này.</p>
            )}
          </div>

          {initialData && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Môn học thuộc bộ môn</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {(initialData.DanhSachMonHoc || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(initialData.DanhSachMonHoc || []).map((mh) => (
                        <span
                          key={mh.monhoc_id}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 text-xs font-semibold"
                        >
                          {mh.ma_mon ? `${mh.ma_mon} - ` : ''}{mh.ten_mon}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">Chưa có môn học thuộc bộ môn này.</div>
                  )}
                </div>
              </div>
            </>
          )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Chọn môn học cho bộ môn</label>
              <div className="relative" ref={monHocDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={showMonHocDropdown ? monHocSearch : selectedMonHocText()}
                    readOnly={!showMonHocDropdown}
                    onClick={() => {
                      setShowMonHocDropdown(true);
                      setMonHocSearch('');
                    }}
                    onChange={(e) => setMonHocSearch(e.target.value)}
                    placeholder={selectedMonHocIds.length > 0 ? '' : 'Chọn môn học...'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] text-sm bg-white pr-9"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    {showMonHocDropdown ? <Search size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {showMonHocDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {filteredMonHocOptions.length > 0 ? (
                      filteredMonHocOptions.map((mh) => {
                        const isSelected = selectedMonHocIds.includes(mh.monhoc_id);
                        const { boMonId, boMonName } = getMonHocBoMonInfo(mh);
                        const belongsCurrent = !!currentBoMonId && boMonId === currentBoMonId;
                        const belongsOther = !!boMonId && !belongsCurrent;
                        return (
                          <div
                            key={mh.monhoc_id}
                            onClick={() => toggleMonHoc(mh.monhoc_id)}
                            className={`px-3 py-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 flex justify-between items-center select-none ${isSelected ? 'bg-blue-50' : ''}`}
                          >
                            <div className="flex flex-col gap-1 pr-2">
                              <span className={`${isSelected ? 'text-[#3B5998] font-medium' : 'text-gray-700'}`}>
                                {mh.ma_mon ? `${mh.ma_mon} - ` : ''}{mh.ten_mon}
                              </span>
                              {belongsCurrent && (
                                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 w-fit">
                                  Đang thuộc bộ môn này
                                </span>
                              )}
                              {belongsOther && (
                                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 w-fit">
                                  Đang thuộc: {boMonName || 'Bộ môn khác'}
                                </span>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#3B5998] border-[#3B5998]' : 'bg-white border-gray-300'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center flex flex-col items-center">
                        <Search size={24} className="mb-1 opacity-50" />
                        Không tìm thấy môn học
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4 bg-white">
            <div className="flex gap-3">
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
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default BoMonModal;
