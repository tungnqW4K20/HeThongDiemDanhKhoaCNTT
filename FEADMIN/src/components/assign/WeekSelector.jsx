import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const WeekSelector = ({ weeks = [], selectedWeekId, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentWeek = weeks.find((w) => w.id === selectedWeekId);
  const currentIdx = weeks.findIndex((w) => w.id === selectedWeekId);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Xử lý nút Previous
  const handlePrev = () => {
    if (currentIdx > 0) onChange(weeks[currentIdx - 1].id);
  };

  // Xử lý nút Next
  const handleNext = () => {
    if (currentIdx < weeks.length - 1) onChange(weeks[currentIdx + 1].id);
  };

  if (weeks.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
        {/* Nút lùi tuần */}
        <button 
            onClick={handlePrev}
            disabled={currentIdx <= 0}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-[#3B5998] hover:border-[#3B5998] disabled:opacity-50 disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-all shadow-sm"
        >
            <ChevronLeft size={18} />
        </button>

        {/* Dropdown chọn tuần */}
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-3 bg-white border border-gray-200 pl-4 pr-10 py-2 rounded-lg shadow-sm
                        hover:border-[#3B5998] transition-all min-w-[200px]"
            >
                <div className="p-1 bg-green-50 text-green-600 rounded">
                    <Calendar size={16} />
                </div>
                <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thời gian</p>
                    <p className="font-bold text-gray-700 text-sm truncate">
                        {currentWeek ? `${currentWeek.label}` : "Chọn tuần"}
                        <span className="text-gray-400 font-normal ml-1 text-xs">{currentWeek?.rangeText}</span>
                    </p>
                </div>
                <ChevronDown
                    size={16}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {weeks.map((week) => (
                        <button
                            key={week.id}
                            onClick={() => {
                                onChange(week.id);
                                setOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                            ${
                                week.id === selectedWeekId
                                ? "bg-green-50 text-green-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }
                            `}
                        >
                            <span>{week.label}</span>
                            <span className="text-xs text-gray-400">{week.rangeText}</span>
                        </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Nút tiến tuần */}
        <button 
            onClick={handleNext}
            disabled={currentIdx >= weeks.length - 1}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-[#3B5998] hover:border-[#3B5998] disabled:opacity-50 disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-all shadow-sm"
        >
            <ChevronRight size={18} />
        </button>
    </div>
  );
};

export default WeekSelector;