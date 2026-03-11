import React, { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, X, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Định nghĩa màu nội bộ
const THEME_COLOR = '#3B5998';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AttendanceStats = ({ stats, fileName, onFileSelect, onClear, onSave }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-6">
      {/* 1. KHU VỰC UPLOAD */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-white",
          isDragOver ? "border-[#3B5998] bg-blue-50" : "border-gray-300 hover:border-[#3B5998]"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={(e) => e.target.files[0] && onFileSelect(e.target.files[0])} 
        />
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-blue-50 text-[#3B5998]">
            <Upload size={32} />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Click hoặc Kéo thả file Excel</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls (Max 5MB)</p>
          </div>
        </div>
      </div>

      {/* Nút tải mẫu - Luôn hiển thị */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
        <div className="text-sm text-gray-600">Chưa có mẫu file?</div>
        <button className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: THEME_COLOR }}>
          <Download size={14} /> Tải file mẫu
        </button>
      </div>

      {/* 2. KHU VỰC THỐNG KÊ (Chỉ hiện khi có file) */}
      {fileName && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fade-in">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              Kết quả phân tích
            </h3>
            <button onClick={onClear} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="text-sm text-gray-500 mb-4 truncate">
            File: <span className="font-medium text-gray-800">{fileName}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-500">Tổng SV</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold" style={{ color: THEME_COLOR }}>{stats.rate}%</div>
              <div className="text-xs text-[#3B5998]">Tỉ lệ có mặt</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Có mặt</span>
              <span className="font-semibold text-green-600">{stats.present}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }}></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Vắng/Muộn</span>
              <span className="font-semibold text-red-500">{stats.absent}</span>
            </div>
          </div>

          <button 
            onClick={onSave}
            className="w-full mt-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            style={{ backgroundColor: THEME_COLOR }}
          >
            <Save size={18} />
            Lưu vào hệ thống
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceStats;