import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2, Trash2, Calendar, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import hocKyService from '../../service/hockyService';
import khoaService from '../../service/khoaService';

const ImportScheduleModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Lưu trữ Object học kỳ được chọn để lấy đủ thông tin ngay_batdau, ngay_ketthuc...
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [boMonOptions, setBoMonOptions] = useState([]);
  const [selectedBoMonId, setSelectedBoMonId] = useState('');

  const fileInputRef = useRef(null);

  // Load danh sách học kỳ
  useEffect(() => {
    if (isOpen) {
        const fetchHocKy = async () => {
            try {
                const [hocKyRes, khoaRes] = await Promise.all([
                  hocKyService.getAll(),
                  khoaService.getAll()
                ]);

                const list = hocKyRes.data?.data || hocKyRes.data || [];
                setSemesters(list);

                const khoaList = khoaRes.data?.data || khoaRes.data || [];
                const flattenedBoMon = khoaList.flatMap((khoa) => {
                  const boMonList = khoa.DanhSachChuyenNganh || [];
                  return boMonList.map((bm) => ({
                    id: bm.chuyennganh_id,
                    ten: bm.ten_chuyennganh,
                    ma: bm.ma_chuyennganh,
                    tenKhoa: khoa.ten_khoa
                  }));
                });
                setBoMonOptions(flattenedBoMon);
            } catch (err) {
                console.error("Lỗi load học kỳ", err);
            }
        };
        fetchHocKy();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý khi chọn học kỳ từ dropdown
  const handleSemesterChange = (e) => {
    const id = e.target.value;
    const sem = semesters.find(s => s.hocky_id === id);
    setSelectedSemester(sem);
  };

  // Tải file mẫu khớp với cấu trúc trường (Tuần, Thứ, Tiết bắt đầu...)
  const handleDownloadTemplate = () => {
    const templateHeader = [
        "Tuần", "Thứ", "Tiết bắt đầu", "Số tiết", "Tên phòng", "Mã lớp",
        "Tên học phần", "Khoa", "Bộ môn", "Mã GV", "Họ và tên GV", "Họ và tên GV dạy thay",
        "Sĩ số", "Đợt", "Điện thoại GV", "T/ chất", "Thời gian"
    ];
    const ws = XLSX.utils.aoa_to_sheet([templateHeader]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LichHoc");
    XLSX.writeFile(wb, "Template_Import_LichHoc.xlsx");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        setFile(selectedFile);
        // Preview logic...
    }
  };

  const handleSubmit = () => {
    if (!file) { setErrorMsg("Vui lòng chọn file Excel"); return; }
    if (!selectedSemester) { setErrorMsg("Vui lòng chọn Học kỳ"); return; }

    // MAP DỮ LIỆU SANG BACKEND
    // Backend cần: ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1
    console.log("selectedSemester", selectedSemester)
    const payload = {
        file: file,
        ten_hocky: selectedSemester.ten_hocky,
        ngay_batdau: selectedSemester.ngay_batdau,
        ngay_ketthuc: selectedSemester.ngay_ketthuc,
        ngay_monday_tuan_1: selectedSemester.ngay_monday_tuan_1,
      semesterId:selectedSemester?.hocky_id,
      bomon_id: selectedBoMonId || null
    };

    onImport(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mt-[50px] max-h-[600px] overflow-hidden border border-gray-100 flex flex-col overflow-y-auto">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-[#3B5998] flex items-center gap-2 uppercase tracking-tight">
              <FileSpreadsheet className="text-emerald-600" size={24}/>
              Import Lịch Trình
            </h3>
            <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">Hỗ trợ file phân công giảng dạy từ Excel</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          
          {/* Section: Chọn học kỳ */}
          <div className="space-y-3">
             <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Bước 1: Chọn học kỳ áp dụng</label>
             <div className="relative">
                <select 
                    value={selectedSemester?.hocky_id || ""}
                    onChange={handleSemesterChange}
                    className="w-full pl-4 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-50 focus:border-[#3B5998] transition-all outline-none"
                >
                    <option value="">-- Click để chọn học kỳ --</option>
                    {semesters.map(s => (
                        <option key={s.hocky_id} value={s.hocky_id}>{s.ten_hocky}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
             </div>
             
             {/* Hiển thị mốc thời gian đã chọn */}
             {selectedSemester && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <p className="text-[9px] font-black text-blue-400 uppercase">Mốc tuần 1 (Thứ 2)</p>
                        <p className="text-sm font-black text-[#3B5998]">{selectedSemester.ngay_monday_tuan_1}</p>
                    </div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Ngày kết thúc</p>
                        <p className="text-sm font-black text-slate-600">{selectedSemester.ngay_ketthuc}</p>
                    </div>
                </div>
             )}

               <div className="relative mt-2">
                <select
                  value={selectedBoMonId}
                  onChange={(e) => setSelectedBoMonId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-50 focus:border-[#3B5998] transition-all outline-none"
                >
                  <option value="">-- Import tất cả bộ môn --</option>
                  {boMonOptions.map((bm) => (
                    <option key={bm.id} value={bm.id}>
                      {bm.ten} ({bm.ma || 'N/A'}) - {bm.tenKhoa}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
               </div>
          </div>

          {/* Section: Upload file */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Bước 2: Tải lên dữ liệu</label>
            <div 
                className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group
                ${file ? 'bg-emerald-50/30 border-emerald-200' : 'border-gray-200 hover:border-[#3B5998] hover:bg-blue-50/30'}
                `}
                onClick={() => !file && fileInputRef.current.click()}
            >
                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                
                {!file ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-2xl text-gray-400 group-hover:text-[#3B5998] transition-colors">
                    <Upload size={32} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-black text-slate-700">Kéo thả file vào đây hoặc Click để chọn</p>
                        <p className="text-[11px] text-gray-400 font-medium italic">Hệ thống sẽ tự động gộp lớp ghép và tách ca học</p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                        className="mt-2 px-4 py-2 bg-white border border-gray-200 text-[#3B5998] text-[11px] font-black uppercase rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2"
                    >
                        <Download size={14} /> Tải file mẫu
                    </button>
                </div>
                ) : (
                <div className="flex items-center justify-between gap-4 w-full max-w-sm mx-auto bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="flex items-center gap-4 text-left">
                        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                            <CheckCircle size={28} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sẵn sàng để import</p>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
                )}
            </div>
          </div>

          {errorMsg && (
              <div className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 animate-shake">
                <AlertCircle size={20} />
                <span className="text-xs font-bold uppercase tracking-tight">{errorMsg}</span>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center px-8">
            <span className="text-[10px] text-gray-400 font-bold italic max-w-[200px]">
              * Có thể thêm cột Khoa và Bộ môn trong file để import scope quản lý.
            </span>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 text-gray-500 font-bold text-sm hover:text-slate-800 transition-colors">
                    Hủy bỏ
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={!file || isLoading || !selectedSemester}
                    className={`px-8 py-3 bg-[#3B5998] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95
                    ${(!file || isLoading || !selectedSemester) ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : 'hover:bg-[#2e4676]'}
                    `}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {isLoading ? 'ĐANG XỬ LÝ...' : 'BẮT ĐẦU IMPORT'}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ImportScheduleModal;