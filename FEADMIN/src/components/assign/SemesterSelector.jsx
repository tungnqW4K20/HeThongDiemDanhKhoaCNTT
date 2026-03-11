import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const SemesterSelector = ({ semesters = [], currentSemesterId, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tìm học kỳ hiện tại (Thêm safe check ?. để tránh lỗi nếu semesters là null)
  const currentSemester = Array.isArray(semesters) 
    ? semesters.find((s) => s.hocky_id === currentSemesterId)
    : null;

  // --- Close dropdown when clicking outside ---
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Button */}
      <button
        type="button" // Thêm type="button" để tránh submit form nếu đặt trong form
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 bg-white border border-gray-200 pl-4 pr-10 py-2.5 rounded-xl shadow-sm
                   hover:border-[#3B5998] hover:ring-1 hover:ring-[#3B5998] transition-all min-w-[280px]"
      >
        <div className="p-1.5 bg-blue-50 text-[#3B5998] rounded-lg shrink-0">
          <Calendar size={18} />
        </div>

        <div className="text-left flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-semibold uppercase">Học kỳ hiện tại</p>
          <p className="font-bold text-gray-800 text-sm truncate">
            {/* Hiển thị text an toàn */}
            {currentSemester ? currentSemester.ten_hocky : "Chọn học kỳ"}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && semesters.length > 0 && (
        <div
          className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden 
                     z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
            {semesters.map((sem) => (
              <button
                key={sem.hocky_id}
                type="button"
                onClick={() => {
                  onChange(sem.hocky_id);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between
                  ${
                    sem.hocky_id === currentSemesterId
                      ? "bg-blue-50/50 text-[#3B5998] font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <span className="truncate pr-2">{sem.ten_hocky}</span>
                {sem.hocky_id === currentSemesterId && (
                  <div className="w-2 h-2 rounded-full bg-[#3B5998] shrink-0"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Fallback nếu không có dữ liệu */}
      {open && semesters.length === 0 && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-4 text-center text-gray-500 text-sm">
            Chưa có dữ liệu học kỳ
        </div>
      )}
    </div>
  );
};

export default SemesterSelector;