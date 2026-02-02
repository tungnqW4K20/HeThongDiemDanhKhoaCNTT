'use strict';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, CheckCircle2, Clock, AlertOctagon, 
  Search, Filter, Calendar, FileSpreadsheet, X, 
  Download, ChevronLeft, ChevronRight, Eye, 
  UploadCloud, BookOpen, ChevronDown, Loader2, AlertTriangle, RefreshCw,
  MapPin
} from 'lucide-react';

import hocKyService from '../../service/hockyService.js'; 

// --- 1. CÁC HÀM XỬ LÝ NGÀY THÁNG AN TOÀN ---

const getSafeDate = (dateInput) => {
    try {
        if (!dateInput) return null;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null; 
        d.setHours(0, 0, 0, 0);
        return d;
    } catch (e) {
        return null;
    }
};

const formatDateVN = (date) => {
    if (!date) return '--/--';
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatISODate = (date) => {
    if (!date) return '';
    const offset = date.getTimezoneOffset();
    const d = new Date(date.getTime() - (offset*60*1000));
    return d.toISOString().split('T')[0];
}

/**
 * SINH DANH SÁCH TUẦN
 * 🔥 LOGIC MỚI: Sử dụng ngay_monday_tuan_1 làm ngày bắt đầu trọn vẹn của Tuần 1
 */
const generateWeeks = (anchorMondayStr, endDateStr) => {
    const sDate = getSafeDate(anchorMondayStr); // Nhận vào ngay_monday_tuan_1
    const eDate = getSafeDate(endDateStr);

    if (!sDate || !eDate || sDate > eDate) return [];

    const weeks = [];
    
    // Vì anchorMondayStr đã là Thứ 2 chuẩn từ Backend, ta bắt đầu vòng lặp từ đó luôn
    let currentMonday = new Date(sDate);

    let weekCount = 1;
    let safetyLoop = 0;

    while (currentMonday <= eDate && safetyLoop < 100) {
        const weekStart = new Date(currentMonday);
        const weekEnd = new Date(currentMonday);
        weekEnd.setDate(weekStart.getDate() + 6); // Chủ nhật
        weekEnd.setHours(23, 59, 59, 999);

        const labelRange = `${weekStart.getDate()}/${weekStart.getMonth()+1} - ${weekEnd.getDate()}/${weekEnd.getMonth()+1}`;

        weeks.push({
            id: weekCount,
            label: `Tuần ${weekCount}`,
            dateRange: labelRange,
            start: weekStart,
            end: weekEnd
        });

        currentMonday.setDate(currentMonday.getDate() + 7);
        weekCount++;
        safetyLoop++;
    }
    return weeks;
};

// --- 2. DỮ LIỆU MOCK (SINH ĐỘNG THEO TUẦN) ---
const generateMockData = (week) => {
    if (!week) return [];
    const d1 = new Date(week.start);
    const d2 = new Date(week.start); d2.setDate(d1.getDate() + 2);
    const d3 = new Date(week.start); d3.setDate(d1.getDate() + 4);

    return [
        {
            id: `ss-${week.id}-1`, ma_lop_hp: 'INT1005_1', ten_mon: 'Lập trình Web', 
            giang_vien: 'Nguyễn Văn An', email_gv: 'an@uni.edu.vn', phong: 'P301', 
            ca_hoc: '07:00 - 09:00', si_so: 60, da_diem_danh: 55, trang_thai: 'completed', 
            ngay: formatISODate(d1)
        },
        {
            id: `ss-${week.id}-2`, ma_lop_hp: 'INT3022_2', ten_mon: 'Cơ sở dữ liệu', 
            giang_vien: 'Trần Thị B', email_gv: 'b@uni.edu.vn', phong: 'Lab 2', 
            ca_hoc: '09:00 - 11:30', si_so: 45, da_diem_danh: 0, trang_thai: 'pending', 
            ngay: formatISODate(d2)
        },
        {
            id: `ss-${week.id}-3`, ma_lop_hp: 'INT2024_3', ten_mon: 'Mạng máy tính', 
            giang_vien: 'Lê Văn C', email_gv: 'c@uni.edu.vn', phong: 'Hội trường', 
            ca_hoc: '13:00 - 15:00', si_so: 100, da_diem_danh: 80, trang_thai: 'warning', 
            ngay: formatISODate(d3)
        },
    ];
};

// --- 3. COMPONENTS CON (GIỮ NGUYÊN GIAO DIỆN) ---
const StatCard = ({ title, value, subLabel, icon: Icon, variant }) => {
    const styles = {
      blue: { bgIcon: 'bg-blue-100', textVal: 'text-slate-800', iconColor: 'text-blue-600' },
      green: { bgIcon: 'bg-emerald-100', textVal: 'text-emerald-700', iconColor: 'text-emerald-600' },
      orange: { bgIcon: 'bg-amber-100', textVal: 'text-slate-800', iconColor: 'text-amber-600' },
      red: { bgIcon: 'bg-rose-100', textVal: 'text-rose-700', iconColor: 'text-rose-600' }
    };
    const style = styles[variant] || styles.blue;
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100 flex items-center justify-between hover:-translate-y-1 duration-300">
        <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p><h3 className={`text-2xl font-extrabold ${style.textVal}`}>{value}</h3><p className="text-xs text-slate-400 font-medium mt-1">{subLabel}</p></div>
        <div className={`w-12 h-12 rounded-xl ${style.bgIcon} flex items-center justify-center ${style.iconColor}`}><Icon size={24} strokeWidth={2} /></div>
      </div>
    );
};

const StatusBadge = ({ status }) => {
    const config = {
      completed: { label: 'Đã hoàn thành', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, border: 'border-emerald-200' },
      pending: { label: 'Chưa điểm danh', bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock, border: 'border-slate-200' },
      warning: { label: 'Vắng cao', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle, border: 'border-amber-200' },
    };
    const current = config[status] || config.pending;
    const Icon = current.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border} whitespace-nowrap`}><Icon size={12} strokeWidth={2.5} />{current.label}</span>
    );
};

const ImportModal = ({ isOpen, onClose, sessionData }) => {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    if (!isOpen) return null;
    const handleFileChange = (e) => { if (e.target.files[0]) setFile(e.target.files[0]); };
    const handleSave = () => {
      setIsProcessing(true);
      setTimeout(() => { setIsProcessing(false); alert(`Đã cập nhật dữ liệu cho lớp ${sessionData?.ma_lop_hp}`); onClose(); }, 1500);
    };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div><h3 className="text-lg font-bold text-slate-800">Import điểm danh</h3><p className="text-xs text-slate-500 mt-0.5">Thủ công từ file Excel</p></div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-6">
            <div onClick={() => !file && fileInputRef.current.click()} className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative group ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-300 hover:border-[#3B5998] hover:bg-slate-50'}`}>
              <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
              {file ? (
                <div><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={24} /></div><p className="text-sm font-bold text-slate-800 line-clamp-1">{file.name}</p></div>
              ) : (
                <div className="py-4"><div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><UploadCloud size={28} /></div><p className="text-sm font-bold text-slate-700">Tải file lên</p></div>
              )}
            </div>
          </div>
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-lg">Hủy bỏ</button>
            <button onClick={handleSave} disabled={!file || isProcessing} className={`px-6 py-2.5 text-sm font-bold text-white bg-[#3B5998] rounded-lg shadow-md flex items-center gap-2 transition-all ${(!file || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2d4373]'}`}>
              {isProcessing ? <RefreshCw size={16} className="animate-spin"/> : <UploadCloud size={16} />} {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    );
};

// --- 4. MAIN PAGE ---
const AttendancePagegggg = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [semesters, setSemesters] = useState([]);
  const [currentSemesterId, setCurrentSemesterId] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');

  // 1. Fetch Học Kỳ
  useEffect(() => {
    const fetchSemesters = async () => {
      setIsLoading(true);
      try {
        const res = await hocKyService.getAll();
        const data = res.data || res; // Xử lý data bọc hoặc không bọc bởi axios interceptor

        if (Array.isArray(data) && data.length > 0) {
            setSemesters(data);
            setCurrentSemesterId(data[0].hocky_id);
        }
      } catch (error) {
        console.error("Lỗi API Học kỳ:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSemesters();
  }, []);

  // 2. Chia Tuần khi đổi Học Kỳ
  // 🔥 CẬP NHẬT: Dùng ngay_monday_tuan_1 làm mốc Tuần 1
  useEffect(() => {
    if (!currentSemesterId || semesters.length === 0) return;

    const sem = semesters.find(s => s.hocky_id === currentSemesterId);
    if (sem && sem.ngay_monday_tuan_1 && sem.ngay_ketthuc) {
        const generated = generateWeeks(sem.ngay_monday_tuan_1, sem.ngay_ketthuc);
        setWeeks(generated);
        
        // Mặc định chọn tuần 1
        if (generated.length > 0) {
            setSelectedWeekId(generated[0].id);
        }
    }
  }, [currentSemesterId, semesters]);

  // 3. Lọc và Tạo dữ liệu hiển thị (Memoized)
  const filteredData = useMemo(() => {
    if (!selectedWeekId || weeks.length === 0) return [];

    const currentWeekObj = weeks.find(w => w.id === Number(selectedWeekId));
    if (!currentWeekObj) return [];

    const mockData = generateMockData(currentWeekObj);

    return mockData.filter(item => {
        const term = searchTerm.toLowerCase();
        const matchSearch = item.ten_mon.toLowerCase().includes(term) || 
                            item.giang_vien.toLowerCase().includes(term) ||
                            item.ma_lop_hp.toLowerCase().includes(term);
        const matchStatus = filterStatus === 'all' || item.trang_thai === filterStatus;
        return matchSearch && matchStatus;
    });
  }, [selectedWeekId, weeks, searchTerm, filterStatus]);

  const stats = useMemo(() => ({
    total: filteredData.length,
    completed: filteredData.filter(s => s.trang_thai === 'completed').length,
    pending: filteredData.filter(s => s.trang_thai === 'pending').length,
    warning: filteredData.filter(s => s.trang_thai === 'warning').length,
  }), [filteredData]);

  const handlePrevWeek = () => {
      const currentIdx = weeks.findIndex(w => w.id === Number(selectedWeekId));
      if (currentIdx > 0) setSelectedWeekId(weeks[currentIdx - 1].id);
  };

  const handleNextWeek = () => {
      const currentIdx = weeks.findIndex(w => w.id === Number(selectedWeekId));
      if (currentIdx !== -1 && currentIdx < weeks.length - 1) setSelectedWeekId(weeks[currentIdx + 1].id);
  };

  const currentWeekLabel = weeks.find(w => w.id === Number(selectedWeekId));

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* HEADER (GIỮ NGUYÊN GIAO DIỆN) */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Kiểm Soát Điểm Danh</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Trung tâm điều hành đào tạo</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            {/* Học kỳ Selector */}
            <div className="relative group min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><BookOpen size={18} className="text-slate-400"/></div>
                <select 
                    value={currentSemesterId} 
                    onChange={(e) => setCurrentSemesterId(e.target.value)} 
                    className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3B5998] appearance-none cursor-pointer"
                >
                    {semesters.map(s => <option key={s.hocky_id} value={s.hocky_id}>{s.ten_hocky}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><ChevronDown size={16} className="text-slate-400" /></div>
            </div>

            {/* Tuần Selector (GIỮ NGUYÊN GIAO DIỆN) */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button onClick={handlePrevWeek} disabled={weeks.length === 0 || Number(selectedWeekId) === weeks[0]?.id} className="p-2 text-slate-400 hover:text-[#3B5998] hover:bg-blue-50 rounded-lg disabled:opacity-30"><ChevronLeft size={20} /></button>
                <div className="relative group min-w-[220px]">
                    <select 
                        value={selectedWeekId} 
                        onChange={(e) => setSelectedWeekId(Number(e.target.value))} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                        disabled={weeks.length === 0}
                    >
                        {weeks.map(w => <option key={w.id} value={w.id}>{w.label} ({w.dateRange})</option>)}
                    </select>
                    <div className="flex flex-col items-center justify-center py-1">
                        {isLoading ? <span className="text-slate-400 text-sm">Đang tải...</span> : (
                            <>
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Calendar size={16} className="text-[#3B5998]" /> {currentWeekLabel ? currentWeekLabel.label : 'Chưa có lịch'}</span>
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 rounded mt-0.5">{currentWeekLabel ? currentWeekLabel.dateRange : '--/--'}</span>
                            </>
                        )}
                    </div>
                </div>
                <button onClick={handleNextWeek} disabled={weeks.length === 0 || Number(selectedWeekId) === weeks[weeks.length-1]?.id} className="p-2 text-slate-400 hover:text-[#3B5998] hover:bg-blue-50 rounded-lg disabled:opacity-30"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>

        {/* STATS (GIỮ NGUYÊN GIAO DIỆN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Lớp Trong Tuần" value={stats.total} subLabel="Tổng số lớp" icon={LayoutDashboard} variant="blue" />
          <StatCard title="Đã Hoàn Thành" value={stats.completed} subLabel="Đã điểm danh" icon={CheckCircle2} variant="green" />
          <StatCard title="Chưa Điểm Danh" value={stats.pending} subLabel="Cần nhắc nhở" icon={Clock} variant="orange" />
          <StatCard title="Cảnh Báo Vắng" value={stats.warning} subLabel="Vắng > 20%" icon={AlertOctagon} variant="red" />
        </div>

        {/* TABLE (GIỮ NGUYÊN GIAO DIỆN) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="relative w-full xl:w-96 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#3B5998]" /></div>
              <input type="text" placeholder="Tìm kiếm học phần, giảng viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium outline-none focus:bg-white transition-all" />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[{ id: 'all', label: 'Tất cả' }, { id: 'completed', label: 'Đã xong' }, { id: 'pending', label: 'Chưa nhập' }, { id: 'warning', label: 'Cảnh báo' }].map(tab => (
                <button key={tab.id} onClick={() => setFilterStatus(tab.id)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === tab.id ? 'bg-white text-[#3B5998] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[35%] tracking-wider">Lớp Học Phần / Môn</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[20%] tracking-wider">Giảng Viên</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] tracking-wider">Thời Gian</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] text-center tracking-wider">Tiến Độ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] text-right tracking-wider">Tác Vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.length > 0 ? filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1 pr-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.trang_thai} />
                          <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-1.5 rounded">{item.ma_lop_hp}</span>
                        </div>
                        <span className="font-bold text-slate-800 text-base line-clamp-2">{item.ten_mon}</span>
                        <div className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {item.phong}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-3 pr-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B5998] to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">{item.giang_vien.split(' ').pop()[0]}</div>
                        <div className="min-w-0"><p className="font-bold text-slate-700 truncate">{item.giang_vien}</p><p className="text-xs text-slate-400 truncate">{item.email_gv}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded w-fit text-xs whitespace-nowrap"><Clock size={12} /> {item.ca_hoc}</span>
                        <span className="text-xs text-slate-400 pl-1">{formatDateVN(item.ngay)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-col items-center w-full max-w-[120px] mx-auto">
                        <div className="flex justify-between w-full mb-1.5"><span className="text-xs font-bold text-slate-700">{item.da_diem_danh}</span><span className="text-xs text-slate-400">/ {item.si_so}</span></div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${(item.da_diem_danh / item.si_so) < 0.5 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(item.da_diem_danh / item.si_so) * 100}%` }}></div></div>
                        <span className="text-[10px] font-medium text-slate-400 mt-1 whitespace-nowrap">{item.si_so > 0 ? Math.round((item.da_diem_danh / item.si_so) * 100) : 0}% tham gia</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-500 hover:text-[#3B5998] hover:bg-blue-50 rounded-lg transition-colors" title="Xem chi tiết"><Eye size={18} /></button>
                        <button onClick={() => { setSelectedSession(item); setIsModalOpen(true); }} className="p-2 text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 hover:border-emerald-200 shadow-sm" title="Import Excel"><FileSpreadsheet size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="px-6 py-32 text-center"><div className="flex flex-col items-center justify-center text-slate-300"><Filter size={32} className="mb-2"/><p className="text-slate-600 font-bold text-base">Không tìm thấy dữ liệu trong tuần này</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} sessionData={selectedSession} />
    </div>
  );
};

export default AttendancePagegggg;