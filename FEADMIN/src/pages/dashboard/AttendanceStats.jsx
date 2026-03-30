'use strict';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Search, Loader2, ArrowLeft, Info, User, Users, 
  AlertTriangle, BookOpen, Calendar, SortAsc, LayoutGrid, List
} from 'lucide-react';
import dashboardService from '../../service/dashboardService';

const AttendanceStats = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [classList, setClassList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedBoMon, setSelectedBoMon] = useState('all');
  const [dailyReport, setDailyReport] = useState({
    bo_mon_options: [],
    daily_classes: [],
    warnings_students: [],
    warnings_lecturers: []
  });
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('high'); // high: vắng nhiều nhất, low: ít nhất

  // 1. Khởi tạo lấy danh sách học kỳ
  useEffect(() => {
    const initSemesters = async () => {
      try {
        const res = await dashboardService.getSemesters();
        if (res.success && res.data.length > 0) {
          setSemesters(res.data);
          setSelectedSemester(res.defaultId);
        }
      } catch (err) { console.error("Lỗi học kỳ:", err); }
    };
    initSemesters();
  }, []);

  // 2. Lấy dữ liệu thống kê khi đổi học kỳ
  useEffect(() => {
    if (selectedSemester) {
      fetchStats(selectedSemester);
    }
  }, [selectedSemester]);

  useEffect(() => {
    if (selectedSemester) {
      fetchDailyReport();
    }
  }, [selectedSemester, selectedDate, selectedBoMon]);

  const fetchStats = async (hkId) => {
    setLoading(true);
    try {
      const res = await dashboardService.getOverallAttendance(hkId);
      if (res.success) setClassList(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleViewDetail = async (lhpId) => {
    setLoading(true);
    try {
      const res = await dashboardService.getClassDetailAttendance(lhpId);
      if (res.success) setSelectedClass(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDailyReport = async () => {
    setDailyLoading(true);
    try {
      const res = await dashboardService.getDailyAttendanceReport({
        hocky_id: selectedSemester,
        ngay: selectedDate,
        bomon_id: selectedBoMon
      });
      if (res.success && res.data) {
        setDailyReport(res.data);
      } else {
        setDailyReport({ bo_mon_options: [], daily_classes: [], warnings_students: [], warnings_lecturers: [] });
      }
    } catch (err) {
      console.error('Lỗi thống kê theo ngày:', err);
      setDailyReport({ bo_mon_options: [], daily_classes: [], warnings_students: [], warnings_lecturers: [] });
    } finally {
      setDailyLoading(false);
    }
  };

  // 3. Xử lý dữ liệu hiển thị (Lọc & Sắp xếp)
  const processedData = useMemo(() => {
    let data = classList.filter(item => 
      item.ten_lop.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.ma_lop.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return data.sort((a, b) => {
      return sortBy === 'high' 
        ? b.ti_le_vang - a.ti_le_vang 
        : a.ti_le_vang - b.ti_le_vang;
    });
  }, [classList, searchTerm, sortBy]);

  // Tính toán chiều cao biểu đồ động (45px mỗi hàng)
  const dynamicHeight = Math.max(processedData.length * 45, 400);

  const lopHanhChinhDisplay = Array.isArray(selectedClass?.lop_hanh_chinh)
    ? selectedClass.lop_hanh_chinh.join(', ')
    : 'Chưa có dữ liệu';
  const danhSachSinhVien = Array.isArray(selectedClass?.danh_sach_sinh_vien)
    ? selectedClass.danh_sach_sinh_vien
    : [];
  const boMonOptions = Array.isArray(dailyReport?.bo_mon_options) ? dailyReport.bo_mon_options : [];
  const dailyClasses = Array.isArray(dailyReport?.daily_classes) ? dailyReport.daily_classes : [];
  const warningStudents = Array.isArray(dailyReport?.warnings_students) ? dailyReport.warnings_students : [];
  const warningLecturers = Array.isArray(dailyReport?.warnings_lecturers) ? dailyReport.warnings_lecturers : [];

  if (loading && !selectedClass && semesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-bold animate-pulse">ĐANG TẢI DỮ LIỆU THỐNG KÊ...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {selectedClass ? (
        /* ======================== GIAO DIỆN CHI TIẾT ======================== */
        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4">
          <button 
            onClick={() => setSelectedClass(null)} 
            className="flex items-center gap-2 font-bold text-slate-600 bg-white px-5 py-2.5 rounded-2xl border hover:text-blue-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} /> Quay lại danh sách
          </button>
          
          <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
            <div className="flex flex-col lg:flex-row justify-between border-b border-slate-100 pb-8 mb-8 gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedClass.loai_hoc_phan === 'LT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {selectedClass.loai_hoc_phan === 'LT' ? 'Lý thuyết' : 'Thực hành'}
                        </span>
                        <span className="text-slate-400 font-mono text-xs">{selectedClass.ma_lop}</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 leading-tight">{selectedClass.ten_lophocphan}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><User size={24}/></div>
                        <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giảng viên</p><p className="text-sm font-black">{selectedClass.giang_vien}</p></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm"><Users size={24}/></div>
                      <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lớp hành chính</p><p className="text-sm font-black truncate w-32" title={lopHanhChinhDisplay}>{lopHanhChinhDisplay}</p></div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 sticky left-0 bg-slate-50 z-20 border-r w-64 font-black text-slate-600">Sinh viên</th>
                            <th className="px-4 py-4 text-center border-r w-24 font-black text-slate-600">% Vắng</th>
                            {danhSachSinhVien[0]?.history?.map((h, i) => (
                                <th key={i} className="px-3 py-4 text-center text-[10px] font-mono border-r min-w-[85px] text-slate-400 uppercase">
                                    {new Date(h.ngay).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                          {danhSachSinhVien.map(sv => (
                            <tr key={sv.sinhvien_id} className={`group hover:bg-slate-50 transition-colors ${sv.canh_bao ? 'bg-red-50/30' : ''}`}>
                                <td className={`px-6 py-4 sticky left-0 z-10 border-r shadow-sm font-medium ${sv.canh_bao ? 'bg-red-50 text-red-900' : 'bg-white group-hover:bg-slate-50 text-slate-700'}`}>
                                    <div className="font-bold">{sv.ten_sv}</div>
                                    <div className="text-[10px] opacity-60 font-mono italic">{sv.ma_sv}</div>
                                </td>
                                <td className={`px-4 py-4 text-center font-black border-r ${sv.canh_bao ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>{sv.ti_le_vang}%</td>
                              {sv.history?.map((h, i) => (
                                    <td key={i} className="px-3 py-4 text-center border-r last:border-0">
                                        {h.trangthai === 'present' && <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 mx-auto border-2 border-white shadow-sm" />}
                                        {h.trangthai === 'absent' && <div className="w-3.5 h-3.5 rounded-full bg-red-500 mx-auto border-2 border-white shadow-sm" />}
                                        {h.trangthai === 'late' && <div className="w-3.5 h-3.5 rounded-full bg-amber-500 mx-auto border-2 border-white shadow-sm" />}
                                        {h.trangthai === 'not_recorded' && <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto" />}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== GIAO DIỆN TỔNG QUAN (BẢN FIX HOVER) ======================== */
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* CỘT TRÁI: ĐIỀU KHIỂN & BIỂU ĐỒ */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                  <div className="flex gap-4 items-center">
                    <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-100"><LayoutGrid size={28}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Thống kê vắng học</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap"><Calendar size={12}/> Học kỳ:</span>
                            <select 
                              value={selectedSemester} 
                              onChange={e => setSelectedSemester(e.target.value)} 
                              className="text-sm font-black text-blue-600 bg-transparent border-b-2 border-blue-100 focus:border-blue-600 outline-none transition-all cursor-pointer"
                            >
                                {semesters.map(hk => <option key={hk.hocky_id} value={hk.hocky_id}>{hk.ten_hocky}</option>)}
                            </select>
                        </div>
                    </div>
                  </div>

                  <div className="w-full flex flex-wrap items-center gap-3">
                      <div className="relative w-full sm:w-auto">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="pl-10 pr-3 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-44 transition-all"
                        />
                      </div>
                      <div className="relative w-full sm:w-auto">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                          value={selectedBoMon}
                          onChange={(e) => setSelectedBoMon(e.target.value)}
                          className="pl-10 pr-8 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-52 transition-all cursor-pointer"
                        >
                          <option value="all">Tất cả bộ môn</option>
                          {boMonOptions.map((bm) => (
                            <option key={bm.bomon_id} value={bm.bomon_id}>
                              {bm.ten_bomon}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Tìm nhanh mã/tên lớp..." 
                          value={searchTerm} 
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64 transition-all" 
                        />
                      </div>
                      <button 
                        onClick={() => setSortBy(sortBy === 'high' ? 'low' : 'high')}
                        className="p-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 hover:bg-white hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap w-full sm:w-auto"
                      >
                        <SortAsc size={16} /> {sortBy === 'high' ? 'Vắng nhiều' : 'Vắng ít'}
                      </button>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lớp học phần trong ngày</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{dailyClasses.length}</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Cảnh báo SV nghỉ quá 20%</p>
                    <p className="text-2xl font-black text-red-600 mt-1">{warningStudents.length}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">GV chưa điểm danh buổi hôm nay</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{warningLecturers.length}</p>
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide">Kết quả điểm danh theo ngày</h4>
                    {dailyLoading && <Loader2 size={16} className="animate-spin text-blue-600" />}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold">Lớp học phần</th>
                          <th className="px-4 py-3 text-left font-bold">Giảng viên</th>
                          <th className="px-4 py-3 text-center font-bold">Tiết</th>
                          <th className="px-4 py-3 text-center font-bold">Đã điểm danh</th>
                          <th className="px-4 py-3 text-center font-bold">% Vắng buổi</th>
                          <th className="px-4 py-3 text-center font-bold">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailyClasses.map((row) => (
                          <tr key={row.buoi_id}>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-700">{row.ten_lop}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{row.ma_lop}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.giang_vien}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{row.tiet_bat_dau} - {row.so_tiet}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">{row.da_diem_danh}/{row.tong_sv}</td>
                            <td className="px-4 py-3 text-center font-bold text-red-600">{row.ti_le_vang_buoi}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-black ${row.trang_thai_diem_danh === 'Đã điểm danh' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {row.trang_thai_diem_danh}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {dailyClasses.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400">Không có lớp học phần trong ngày đã chọn.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl border border-red-100 overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-xs font-black text-red-600 uppercase tracking-wider">Cảnh báo sinh viên nghỉ quá 20%</div>
                    <div className="max-h-56 overflow-auto divide-y divide-slate-100">
                      {warningStudents.length > 0 ? warningStudents.map((w, idx) => (
                        <div key={`${w.sinhvien_id}-${idx}`} className="px-4 py-3 text-xs">
                          <p className="font-bold text-slate-700">{w.ten_sv} ({w.ma_sv})</p>
                          <p className="text-slate-500">{w.ten_lop} - {w.ma_lop}</p>
                          <p className="font-black text-red-600 mt-1">Tỷ lệ vắng: {w.ti_le_vang}%</p>
                        </div>
                      )) : <p className="px-4 py-4 text-xs text-slate-400">Chưa có cảnh báo.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 text-xs font-black text-amber-700 uppercase tracking-wider">Cảnh báo giảng viên chưa điểm danh hôm nay</div>
                    <div className="max-h-56 overflow-auto divide-y divide-slate-100">
                      {warningLecturers.length > 0 ? warningLecturers.map((w, idx) => (
                        <div key={`${w.buoi_id}-${idx}`} className="px-4 py-3 text-xs">
                          <p className="font-bold text-slate-700">{w.giang_vien}</p>
                          <p className="text-slate-500">{w.ten_lop} - {w.ma_lop}</p>
                          <p className="font-semibold text-amber-700 mt-1">Tiết {w.tiet_bat_dau} ({w.so_tiet} tiết) - Phòng {w.phong || 'N/A'}</p>
                        </div>
                      )) : <p className="px-4 py-4 text-xs text-slate-400">Không có giảng viên nào đang trễ điểm danh.</p>}
                    </div>
                  </div>
                </div>

                {/* BIỂU ĐỒ CỘT NGANG - FIX LỖI HOVER VÀ HIỂN THỊ RÕ TÊN */}
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar border-t border-slate-50 pt-6">
                  {processedData.length > 0 ? (
                    <div style={{ height: `${dynamicHeight}px`, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={processedData} 
                          layout="vertical" 
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                          
                          {/* Trục X là Tỷ lệ % */}
                          <XAxis type="number" unit="%" hide />
                          
                          {/* Trục Y là Tên lớp (Hiển thị nằm ngang cực rõ) */}
                          <YAxis 
                            dataKey="ten_lop" 
                            type="category" 
                            width={150}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          {/* FIX: Lấy payload chuẩn xác khi hover */}
                          <Tooltip 
                            cursor={{ fill: '#f1f5f9' }} 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                // QUAN TRỌNG: Recharts gán dữ liệu gốc vào payload[0].payload
                                const d = payload[0].payload; 
                                return (
                                  <div className="bg-white p-5 shadow-2xl border border-slate-100 rounded-2xl min-w-[280px] animate-in fade-in zoom-in-95">
                                      <div className="flex justify-between items-start mb-3">
                                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{d.ma_lop}</span>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${d.loai === 'LT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{d.loai}</span>
                                      </div>
                                      <p className="text-sm font-black text-slate-800 leading-tight mb-4">{d.ten_lop}</p>
                                      <div className="space-y-2.5 border-t border-slate-50 pt-4">
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="text-slate-400 font-medium">Giảng viên:</span>
                                              <span className="font-bold text-slate-700">{d.giang_vien}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="text-slate-400 font-medium">Tỷ lệ vắng:</span>
                                              <span className={`text-sm font-black ${d.ti_le_vang > 15 ? 'text-red-500' : 'text-blue-600'}`}>{d.ti_le_vang}%</span>
                                          </div>
                                      </div>
                                      <p className="mt-4 text-[10px] text-blue-500 font-black text-center uppercase tracking-widest animate-pulse">NHẤN ĐỂ XEM CHI TIẾT SINH VIÊN</p>
                                  </div>
                                );
                              }
                              return null;
                            }} 
                          />

                          <Bar 
                            dataKey="ti_le_vang" 
                            onClick={(d) => handleViewDetail(d.lophocphan_id)} 
                            cursor="pointer" 
                            radius={[0, 4, 4, 0]} 
                            barSize={20}
                          >
                            {processedData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.ti_le_vang > 15 ? '#ef4444' : '#3b82f6'} 
                                fillOpacity={0.9} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Search size={48} strokeWidth={1} />
                      <p className="font-bold uppercase tracking-widest text-xs">Không tìm thấy lớp phù hợp</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: CHI TIẾT DANH SÁCH (Dạng bảng rút gọn) */}
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
                 <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><List size={18}/></div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Xếp hạng vắng học</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[640px]">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/50 text-slate-400 font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Lớp</th>
                                <th className="px-4 py-4 text-center">Vắng</th>
                                <th className="px-4 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {processedData.map((item) => (
                                <tr key={item.lophocphan_id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 line-clamp-1 group-hover:text-blue-600 transition-colors">{item.ten_lop}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.ma_lop}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`font-black ${item.ti_le_vang > 15 ? 'text-red-500' : 'text-slate-600'}`}>{item.ti_le_vang}%</span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <button 
                                          onClick={() => handleViewDetail(item.lophocphan_id)} 
                                          className="p-2 hover:bg-white hover:text-blue-600 rounded-lg text-slate-300 transition-all active:scale-90"
                                        >
                                          <ArrowLeft size={16} className="rotate-180" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hiển thị {processedData.length} lớp học phần</p>
                 </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceStats;