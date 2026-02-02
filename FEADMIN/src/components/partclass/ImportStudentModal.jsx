// components/class/ImportStudentModal.jsx
import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const ImportStudentModal = ({ isOpen, onClose, onImport, classId }) => {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState([]);

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

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      setError('Định dạng file không hợp lệ. Vui lòng chọn file Excel (.xlsx) hoặc CSV.');
      return;
    }

    setFile(selectedFile);
  };

  // --- TẠO FILE MẪU THEO ĐỊNH DẠNG TRƯỜNG ĐHSPKT HƯNG YÊN ---
  const handleDownloadTemplate = () => {
    // 1. Tạo cấu trúc dữ liệu theo hàng (Array of Arrays)
    const worksheetData = [
      ["TRƯỜNG ĐHSPKT HƯNG YÊN", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
      ["KHOA CÔNG NGHỆ THÔNG TIN", "", "", "", "Độc lập - Tự do - Hạnh phúc"],
      ["BỘ MÔN CÔNG NGHỆ PHẦN MỀM", "", "", "", ""],
      ["", "", "", "DANH SÁCH SINH VIÊN LỚP TÍN CHỈ"], // Tiêu đề chính
      [], // Hàng trống
      [`Mã lớp: ${classId || '125252'}`],
      ["Tên học phần: Thiết kế web cơ bản (2+1*)", "", "", "Số tín chỉ: 3.0"],
      ["Mã học phần: 221129"],
      ["Tên giáo viên GD: NGUYỄN VĂN QUYẾT", "", "", "Mã CBGD: 1218"],
      [], // Hàng trống
      ["TT", "Mã SV", "Họ và tên", "Lớp SV hiện đang học", "Ngày sinh", "Nơi sinh", "Điện thoại", "Ghi chú"] // Header bảng
    ];

    // Dữ liệu mẫu
    const sampleData = [
      [1, "10125012", "NGUYỄN HOÀI ANH", "125252", "08/07/2007", "", "0988817760", ""],
      [2, "12525002", "NGUYỄN THẾ ANH", "125252", "19/12/2007", "Tỉnh Hưng Yên", "0971618428", ""],
      [3, "12525007", "PHẠM HÙNG XUÂN ANH", "125252", "01/09/2006", "", "0986440483", ""]
    ];

    // Kết hợp tiêu đề và dữ liệu
    const finalData = [...worksheetData, ...sampleData];

    // 2. Tạo worksheet
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // 3. Định dạng độ rộng cột (Width)
    const wscols = [
      { wch: 5 },  // TT
      { wch: 15 }, // Mã SV
      { wch: 25 }, // Họ và tên
      { wch: 20 }, // Lớp SV hiện đang học
      { wch: 15 }, // Ngày sinh
      { wch: 15 }, // Nơi sinh
      { wch: 15 }, // Điện thoại
      { wch: 20 }  // Ghi chú
    ];
    ws['!cols'] = wscols;

    // 4. Merge các ô tiêu đề (Trộn ô) để giống ảnh mẫu
    // S là start, E là end. r là row, c là column (bắt đầu từ 0)
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Trường ĐHSPKT Hưng Yên
      { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } }, // Cộng hòa xã hội...
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Khoa CNTT
      { s: { r: 1, c: 4 }, e: { r: 1, c: 7 } }, // Độc lập tự do...
      { s: { r: 3, c: 3 }, e: { r: 3, c: 5 } }, // Danh sách sinh viên...
    ];
    ws['!merges'] = merges;

    // 5. Xuất file
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Sinh_Vien");
    XLSX.writeFile(wb, `Danh_Sach_Sinh_Vien_${classId || '125252'}.xlsx`);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Vui lòng chọn file để tải lên.");
      return;
    }

    setIsLoading(true);
    setErrorDetails([]);
    
    try {
      await onImport(file, classId);
      setFile(null);
    } catch (err) {
      if (err.details && Array.isArray(err.details)) {
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
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              <FileSpreadsheet size={20} /> Import Danh sách Sinh viên
            </h3>
            <p className="text-xs text-gray-500 mt-1">Sử dụng mẫu chuẩn của trường để import.</p>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <Download size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Tải file mẫu chuẩn</p>
                <p className="text-xs text-blue-600">Định dạng chuẩn ĐHSPKT Hưng Yên</p>
              </div>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white text-blue-600 text-xs font-bold border border-blue-200 rounded hover:bg-blue-50 shadow-sm transition-colors"
            >
              Tải Mẫu
            </button>
          </div>

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
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            
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

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertCircle size={16} /> {error}
              </div>
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

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm">Hủy bỏ</button>
          <button onClick={handleSubmit} disabled={isLoading || !file} className="px-5 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium shadow-sm flex items-center gap-2 text-sm disabled:opacity-50">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {isLoading ? 'Đang xử lý...' : 'Tiến hành Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportStudentModal;