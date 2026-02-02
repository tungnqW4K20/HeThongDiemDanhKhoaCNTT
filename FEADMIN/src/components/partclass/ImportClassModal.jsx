import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import thư viện SheetJS

const ImportClassModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState([]); // Chứa danh sách lỗi chi tiết

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    setErrorDetails([]);
    if (!selectedFile) return;

    // Chấp nhận xlsx, xls
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/)) {
      setError('Định dạng file không hợp lệ. Vui lòng chọn file Excel (.xlsx).');
      return;
    }

    setFile(selectedFile);
  };

  // --- TẠO TEMPLATE EXCEL (Khớp với Backend) ---
  const handleDownloadTemplate = () => {
    const headers = [
      [
        "STT", 
        "HỆ ĐT", 
        "KHÓA", 
        "MÃ LỚP", 
        "SĨ SỐ", 
        "ĐƠN VỊ", 
        "CƠ SỞ", 
        "NHẬP HỌC", 
        "TỐT NGHIỆP", 
        "Mã ngành", 
        "Tên ngành", 
        "Chuyên ngành"
      ]
    ];

    const data = [
      ["1", "ĐHCQ", "K20(22-26)", "10122G.1KS", 25, "CNTT", "CS-Mỹ Hào", "T9/2022", "T12/2026", "7480201", "Công nghệ thông tin", "Đồ họa đa phương tiện"],
      ["2", "ĐHCQ", "K20(22-26)", "10122N.1CN", 30, "CNTT", "CS-Mỹ Hào", "T9/2022", "T6-T8/2026", "7480201", "Công nghệ thông tin", "Mạng máy tính và Truyền thông"]
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    
    // Set độ rộng cột cho đẹp
    const wscols = [
        {wch: 5}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 8}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 25}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Lop");

    XLSX.writeFile(wb, "Mau_Import_LopHanhChinh.xlsx");
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Vui lòng chọn file để tải lên.");
      return;
    }

    setIsLoading(true);
    setErrorDetails([]); 
    
    try {
      await onImport(file);
      // Nếu thành công, reset và (Component cha sẽ đóng modal)
      setFile(null);
    } catch (err) {
      // Hiển thị lỗi nhận được từ Component cha
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
          setError(`Import thất bại: Có ${err.details.length} dòng bị lỗi.`);
          setErrorDetails(err.details);
      } else {
          setError(err.message || "Có lỗi xảy ra khi import file.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => { 
      e.preventDefault(); 
      setIsDragOver(false); 
      validateAndSetFile(e.dataTransfer.files[0]); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              <FileSpreadsheet size={20} /> Import Lớp từ Excel
            </h3>
            <p className="text-xs text-gray-500 mt-1">Sử dụng file mẫu để tránh lỗi dữ liệu.</p>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* Download Template */}
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <Download size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Tải file mẫu chuẩn</p>
                <p className="text-xs text-blue-600">File .xlsx bao gồm mã lớp, khoa, cơ sở...</p>
              </div>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white text-blue-600 text-xs font-bold border border-blue-200 rounded hover:bg-blue-50 shadow-sm transition-colors"
            >
              Tải Xuống
            </button>
          </div>

          {/* Upload Area */}
          <div 
            className={`
              border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative
              ${isDragOver ? 'border-[#3B5998] bg-[#3B5998]/5' : 'border-gray-300 hover:border-[#3B5998] hover:bg-gray-50'}
              ${file ? 'bg-green-50 border-green-200' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
            
            {file ? (
              <div className="animate-in zoom-in duration-300">
                <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3 text-green-600">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <>
                <div className="mx-auto bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mb-3 text-gray-500">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-medium text-gray-700">Kéo thả file Excel vào đây</p>
                <p className="text-xs text-gray-400 mt-1">hoặc click để chọn từ máy tính</p>
              </>
            )}
          </div>

          {/* HIỂN THỊ LỖI */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle size={16} /> {error}
              </div>
              {/* List lỗi chi tiết (nếu có) */}
              {errorDetails.length > 0 && (
                  <ul className="list-disc list-inside pl-1 mt-2 space-y-1 max-h-32 overflow-y-auto text-red-500 bg-white/50 p-2 rounded">
                      {errorDetails.map((detail, idx) => (
                          <li key={idx} className="border-b border-red-100 last:border-0 py-1">{detail}</li>
                      ))}
                  </ul>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors text-sm"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isLoading || !file}
            className="px-5 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-colors shadow-sm flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {isLoading ? 'Đang xử lý...' : 'Tiến hành Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportClassModal;