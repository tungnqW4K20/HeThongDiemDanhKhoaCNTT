import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx'; 

const ImportSubjectModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Tải file mẫu
  const handleDownloadTemplate = () => {
    // 1. Định nghĩa Header và Dữ liệu mẫu (Dạng mảng để cố định thứ tự cột)
    const headers = [["Mã môn", "Tên môn", "Số TC", "Mã khoa", "Mã bộ môn"]];
    
    const data = [
      ["INT1001", "Nhập môn Lập trình", 3, "CNTT", "KTPM"],
      ["ENG1002", "Tiếng Anh cơ bản 1", 4, "CNTT", "HTTT"],
      ["MATH101", "Giải tích 1", 3, "CNTT", "KHMT"]
    ];

    // 2. Tạo Worksheet từ mảng 2 chiều (aoa)
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);

    // 3. Thiết lập độ rộng cột cho đẹp
    const wscols = [
      { wch: 15 }, // Mã môn
      { wch: 35 }, // Tên môn (rộng hơn để chứa tên môn dài)
      { wch: 10 }, // Số TC
      { wch: 15 }, // Mã khoa
      { wch: 18 }  // Mã bộ môn
    ];
    ws['!cols'] = wscols;

    // 4. Tạo Workbook và thêm sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Mon_Hoc");

    // 5. Xuất file
    XLSX.writeFile(wb, "Mau_Import_MonHoc.xlsx");
  };

  // Xử lý chọn file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (fileObj) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(fileObj.type) && !fileObj.name.endsWith('.xlsx')) {
      alert("Vui lòng chỉ upload file Excel (.xlsx, .xls)");
      return;
    }
    
    setFile(fileObj);

    // Đọc file để preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setPreviewData(jsonData.slice(0, 3)); // Lấy 3 dòng đầu
    };
    reader.readAsArrayBuffer(fileObj);
  };

  // Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Gửi file ra ngoài để gọi API
  const handleSubmit = () => {
    if (file) {
      onImport(file);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-green-600"/>
              Import Danh sách Môn học
            </h3>
            <p className="text-xs text-gray-500 mt-1">Hỗ trợ định dạng .xlsx, .xls (cần cột Mã bộ môn)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Step 1: Download Template */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
             <div className="p-2 bg-blue-100 text-[#3B5998] rounded-full mt-1">
                <AlertCircle size={18} />
             </div>
             <div className="flex-1">
                <h4 className="text-sm font-bold text-[#3B5998]">Chưa có file mẫu?</h4>
                <p className="text-xs text-gray-600 mt-1 mb-3">
                   Tải file mẫu chuẩn để nhập liệu chính xác. Vui lòng không thay đổi tiêu đề cột, đặc biệt là cột Mã bộ môn.
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
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group
              ${dragActive ? 'border-[#3B5998] bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-[#3B5998] hover:bg-gray-50'}
              ${file ? 'bg-green-50 border-green-200' : ''}
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
                <div className="p-4 bg-gray-100 rounded-full text-gray-400 group-hover:text-[#3B5998] group-hover:bg-blue-50 transition-colors">
                  <Upload size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">Click để tải lên hoặc kéo thả file vào đây</p>
                  <p className="text-xs text-gray-400 mt-1">Kích thước tối đa 5MB</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 animate-in zoom-in duration-300 w-full max-w-md mx-auto">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-full text-green-600">
                    <CheckCircle size={24} />
                    </div>
                    <div className="text-left">
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

          {/* Preview Data (Optional) */}
          {previewData.length > 0 && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
               <p className="text-xs font-bold text-gray-500 uppercase mb-2">Xem trước dữ liệu (3 dòng đầu):</p>
               <div className="overflow-x-auto border rounded-lg">
                 <table className="min-w-full text-xs text-left text-gray-600">
                   <thead className="bg-gray-50 font-bold">
                     <tr>
                       {Object.keys(previewData[0]).map((key) => (
                         <th key={key} className="px-3 py-2 border-b">{key}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {previewData.map((row, idx) => (
                       <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                         {Object.values(row).map((val, i) => (
                           <td key={i} className="px-3 py-2">{val}</td>
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
            onClick={handleSubmit}
            disabled={!file || isLoading}
            className={`px-6 py-2 bg-[#3B5998] text-white rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm transition-all
              ${(!file || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2e4676] hover:shadow-md'}
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

export default ImportSubjectModal;