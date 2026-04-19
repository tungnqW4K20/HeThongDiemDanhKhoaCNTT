import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportLecturerModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // --- 1. TẠO FILE MẪU EXCEL ---
  const handleDownloadTemplate = () => {
    const templateData = [
      { "Mã GV": "GV001", "Họ": "Nguyễn Văn", "Tên": "An", "Email": "an.nguyen@uni.edu.vn", "SĐT": "0987654321", "Mã Khoa": "CNTT" },
      { "Mã GV": "GV002", "Họ": "Trần Thị", "Tên": "Bình", "Email": "binh.tran@uni.edu.vn", "SĐT": "0912345678", "Mã Khoa": "KT" },
      { "Mã GV": "GV003", "Họ": "Lê Văn", "Tên": "Cường", "Email": "cuong.le@uni.edu.vn", "SĐT": "0998877665", "Mã Khoa": "CK" },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set độ rộng cột
    ws['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachGiangVien");
    
    XLSX.writeFile(wb, "Mau_Import_GiangVien.xlsx");
  };

  // --- 2. XỬ LÝ FILE ---
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (fileObj) => {
    setErrorMsg('');
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(fileObj.type) && !fileObj.name.endsWith('.xlsx')) {
      setErrorMsg("Vui lòng chỉ upload file Excel (.xlsx, .xls)");
      return;
    }
    
    setFile(fileObj);

    // Đọc file để preview
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) setErrorMsg("File rỗng.");
        else setPreviewData(jsonData.slice(0, 3)); // Lấy 3 dòng đầu
      } catch (err) {
        setErrorMsg("Lỗi đọc file. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.readAsArrayBuffer(fileObj);
  };

  // --- DRAG & DROP ---
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewData([]);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              <FileSpreadsheet className="text-green-600" size={22}/>
              Import Danh sách Giảng viên
            </h3>
            <p className="text-xs text-gray-500 mt-1">Hỗ trợ file .xlsx, .xls. Vui lòng sử dụng file mẫu.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Step 1: Download Template */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
             <div className="p-2 bg-blue-100 text-[#3B5998] rounded-full mt-1">
                <Download size={18} />
             </div>
             <div className="flex-1">
                <h4 className="text-sm font-bold text-[#3B5998]">Bước 1: Tải file mẫu</h4>
                <p className="text-xs text-gray-600 mt-1 mb-3">
                   Tải file mẫu chuẩn để nhập liệu chính xác. Cột "Mã Khoa" cần nhập đúng mã định danh (Ví dụ: CNTT, KT...).
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-white border border-blue-200 text-[#3B5998] text-xs font-bold rounded shadow-sm hover:bg-blue-50 flex items-center gap-2 transition-all"
                >
                  <Download size={14} /> Tải file mẫu .xlsx
                </button>
             </div>
          </div>

          {/* Step 2: Upload Area */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group
              ${dragActive ? 'border-[#3B5998] bg-blue-50/50 scale-[1.01]' : 'border-gray-300 hover:border-[#3B5998] hover:bg-gray-50'}
              ${file ? 'bg-green-50/30 border-green-200' : ''}
              ${errorMsg ? 'bg-red-50/30 border-red-200' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current.click()}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange} 
            />
            
            {!file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-gray-100 rounded-full text-gray-400 group-hover:text-[#3B5998] group-hover:bg-blue-100 transition-colors">
                  <Upload size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 group-hover:text-[#3B5998]">Click tải lên hoặc kéo thả file vào đây</p>
                  <p className="text-xs text-gray-400 mt-1">Kích thước tối đa 5MB</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 w-full max-w-md mx-auto">
                <div className="flex items-center gap-3 text-left">
                    <div className="p-3 bg-green-100 rounded-full text-green-600">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 line-clamp-1 break-all">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB • Sẵn sàng</p>
                    </div>
                </div>
                <button 
                  onClick={handleRemoveFile}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
          {errorMsg && (
              <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1 justify-center">
                <AlertCircle size={14} /> {errorMsg}
              </p>
          )}

          {/* Step 3: Preview Data */}
          {previewData.length > 0 && !errorMsg && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
               <p className="text-xs font-bold text-gray-500 uppercase mb-2">Xem trước dữ liệu (3 dòng đầu):</p>
               <div className="overflow-x-auto border rounded-lg">
                 <table className="min-w-full text-xs text-left text-gray-600 whitespace-nowrap">
                   <thead className="bg-gray-50 font-bold text-gray-700 border-b">
                     <tr>
                       {Object.keys(previewData[0]).map((key) => (
                         <th key={key} className="px-3 py-2 border-r last:border-r-0">{key}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {previewData.map((row, idx) => (
                       <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                         {Object.values(row).map((val, i) => (
                           <td key={i} className="px-3 py-2 border-r last:border-r-0">{val}</td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors text-sm"
          >
            Đóng
          </button>
          <button 
            onClick={() => onImport(file)}
            disabled={!file || isLoading || !!errorMsg}
            className={`px-6 py-2 bg-[#3B5998] text-white rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm transition-all
              ${(!file || isLoading || !!errorMsg) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2e4676] hover:shadow-md'}
            `}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isLoading ? 'Đang xử lý...' : 'Tiến hành Import'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ImportLecturerModal;