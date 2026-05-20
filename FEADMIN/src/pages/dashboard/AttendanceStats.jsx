'use strict';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Search, Loader2, ArrowLeft, Info, User, Users, 
  AlertTriangle, BookOpen, Calendar, SortAsc, LayoutGrid
} from 'lucide-react';
import dashboardService from '../../service/dashboardService';

const toYmd = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseYmdToLocalDate = (ymd) => {
  if (!ymd) return null;
  return new Date(`${ymd}T00:00:00`);
};

const clampDateString = (value, min, max) => {
  if (!value) return min || max || '';
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
};

const getIsoWeekString = (date) => {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getWeekRangeFromInput = (weekValue) => {
  if (!weekValue || !weekValue.includes('-W')) return null;
  const [yearStr, weekStr] = weekValue.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  if (!year || !week) return null;

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const weekStartUtc = new Date(jan4);
  weekStartUtc.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);

  const weekEndUtc = new Date(weekStartUtc);
  weekEndUtc.setUTCDate(weekStartUtc.getUTCDate() + 6);

  return {
    from: weekStartUtc.toISOString().slice(0, 10),
    to: weekEndUtc.toISOString().slice(0, 10)
  };
};

const AttendanceStats = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentWeekStr = getIsoWeekString(new Date());
  const [loading, setLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [classList, setClassList] = useState([]);
  const [dateFilterMode, setDateFilterMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekStr);
  const [selectedFromDate, setSelectedFromDate] = useState(todayStr);
  const [selectedToDate, setSelectedToDate] = useState(todayStr);
  const [selectedBoMon, setSelectedBoMon] = useState('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');
  const [dailyReport, setDailyReport] = useState({
    bo_mon_options: [],
    daily_classes: [],
    warnings_students: [],
    warnings_lecturers: []
  });
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('high'); // high: vắng nhiều nhất, low: ít nhất
  const [notifiedStudents, setNotifiedStudents] = useState(new Set());
  const [notifyingAll, setNotifyingAll] = useState(false);
  const latestStatsRequestRef = React.useRef(0);
  const selectedSemesterMeta = useMemo(
    () => semesters.find((hk) => hk.hocky_id === selectedSemester) || null,
    [semesters, selectedSemester]
  );
  const semesterStartDate = selectedSemesterMeta?.ngay_batdau ? toYmd(selectedSemesterMeta.ngay_batdau) : '';
  const semesterEndDate = selectedSemesterMeta?.ngay_ketthuc ? toYmd(selectedSemesterMeta.ngay_ketthuc) : '';
  const semesterWeekOptions = useMemo(() => {
    if (!selectedSemesterMeta || !semesterEndDate) return [];

    const anchorStr = selectedSemesterMeta.ngay_monday_tuan_1
      ? toYmd(selectedSemesterMeta.ngay_monday_tuan_1)
      : semesterStartDate;
    const anchorDate = parseYmdToLocalDate(anchorStr);
    const endDate = parseYmdToLocalDate(semesterEndDate);
    if (!anchorDate || !endDate || anchorDate > endDate) return [];

    const baseWeekNo = Number(selectedSemesterMeta.tuan_bat_dau_co_lich) || 1;
    const options = [];
    const cursor = new Date(anchorDate);
    let index = 0;

    while (cursor <= endDate && index < 60) {
      const from = toYmd(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const boundedEnd = weekEnd > endDate ? endDate : weekEnd;

      options.push({
        value: getIsoWeekString(cursor),
        from,
        to: toYmd(boundedEnd),
        weekNo: baseWeekNo + index,
        label: `Tuần ${baseWeekNo + index} (${toYmd(cursor)} - ${toYmd(boundedEnd)})`
      });

      cursor.setDate(cursor.getDate() + 7);
      index += 1;
    }

    return options;
  }, [selectedSemesterMeta, semesterStartDate, semesterEndDate]);
  const selectedWeekOption = useMemo(
    () => semesterWeekOptions.find((item) => item.value === selectedWeek) || null,
    [semesterWeekOptions, selectedWeek]
  );

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
  const fetchStats = useCallback(async (hkId) => {
    const requestId = ++latestStatsRequestRef.current;
    setLoading(true);
    try {
      const res = await dashboardService.getOverallAttendance(hkId, selectedBoMon);
      if (requestId !== latestStatsRequestRef.current) return;

      if (res.success) {
        setClassList(res.data || []);
      } else {
        setClassList([]);
      }
    } catch (err) { console.error(err); }
    finally {
      if (requestId === latestStatsRequestRef.current) {
        setLoading(false);
      }
    }
  }, [selectedBoMon]);

  useEffect(() => {
    if (selectedSemester) {
      fetchStats(selectedSemester);
    }
  }, [selectedSemester, selectedBoMon, fetchStats]);

  useEffect(() => {
    if (!semesterStartDate || !semesterEndDate) return;

    setSelectedDate((prev) => clampDateString(prev, semesterStartDate, semesterEndDate));
    setSelectedFromDate((prev) => clampDateString(prev, semesterStartDate, semesterEndDate));
    setSelectedToDate((prev) => clampDateString(prev, semesterStartDate, semesterEndDate));
  }, [semesterStartDate, semesterEndDate]);

  useEffect(() => {
    if (!semesterWeekOptions.length) return;

    const hasSelected = semesterWeekOptions.some((item) => item.value === selectedWeek);
    if (hasSelected) return;

    const todayOption = semesterWeekOptions.find((item) => item.from <= todayStr && todayStr <= item.to);
    setSelectedWeek((todayOption || semesterWeekOptions[0]).value);
  }, [semesterWeekOptions, selectedWeek, todayStr]);

  const handleViewDetail = async (lhpId) => {
    setLoading(true);
    try {
      const res = await dashboardService.getClassDetailAttendance(lhpId);
      if (res.success) setSelectedClass(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDailyReport = useCallback(async () => {
    setDailyLoading(true);
    try {
      const safeSelectedDate = clampDateString(selectedDate, semesterStartDate, semesterEndDate);
      const safeFromDate = clampDateString(selectedFromDate, semesterStartDate, semesterEndDate);
      const safeToDate = clampDateString(selectedToDate, semesterStartDate, semesterEndDate);
      const normalizedFromDate = safeFromDate <= safeToDate ? safeFromDate : safeToDate;
      const normalizedToDate = safeFromDate <= safeToDate ? safeToDate : safeFromDate;
      const weekRange = selectedWeekOption || getWeekRangeFromInput(selectedWeek);
      const boundedWeekFrom = clampDateString(weekRange?.from, semesterStartDate, semesterEndDate);
      const boundedWeekTo = clampDateString(weekRange?.to, semesterStartDate, semesterEndDate);

      const res = await dashboardService.getDailyAttendanceReport({
        hocky_id: selectedSemester,
        ngay: dateFilterMode === 'day' ? safeSelectedDate : undefined,
        from_ngay: dateFilterMode === 'week' ? boundedWeekFrom : (dateFilterMode === 'range' ? normalizedFromDate : undefined),
        to_ngay: dateFilterMode === 'week' ? boundedWeekTo : (dateFilterMode === 'range' ? normalizedToDate : undefined),
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
  }, [
    selectedSemester,
    selectedDate,
    selectedWeek,
    selectedFromDate,
    selectedToDate,
    dateFilterMode,
    selectedBoMon,
    semesterStartDate,
    semesterEndDate,
    selectedWeekOption
  ]);

  useEffect(() => {
    if (selectedSemester) {
      fetchDailyReport();
    }
  }, [selectedSemester, fetchDailyReport]);

  const handleNotifyTeacher = async (w) => {
    try {
      const key = `${w.sinhvien_id}-${w.lophocphan_id}`;
      const res = await dashboardService.notifyStudentWarning(w.sinhvien_id, w.lophocphan_id, w.ti_le_vang);
      if (res.success) {
        setNotifiedStudents(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        alert(`Đã gửi thông báo cảnh báo sinh viên ${w.ten_sv} đến các giảng viên liên quan thành công!`);
      } else {
        alert(res.message || 'Gửi thông báo thất bại');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi gửi thông báo.');
    }
  };

  const handleNotifyAll = async () => {
    if (warningStudents.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn gửi thông báo cảnh báo cho tất cả ${warningStudents.length} sinh viên này?`)) return;
    
    setNotifyingAll(true);
    let successCount = 0;
    const newNotified = new Set(notifiedStudents);

    for (const w of warningStudents) {
      const key = `${w.sinhvien_id}-${w.lophocphan_id}`;
      if (newNotified.has(key)) continue;

      try {
        const res = await dashboardService.notifyStudentWarning(w.sinhvien_id, w.lophocphan_id, w.ti_le_vang);
        if (res.success) {
          newNotified.add(key);
          successCount++;
        }
      } catch (err) {
        console.error(`Lỗi gửi thông báo cho sinh viên ${w.ten_sv}:`, err);
      }
    }

    setNotifiedStudents(newNotified);
    setNotifyingAll(false);
    alert(`Đã gửi thành công ${successCount} thông báo cảnh báo chuyên cần!`);
  };

  // 3. Xử lý dữ liệu hiển thị (Lọc & Sắp xếp)
  const processedData = useMemo(() => {
    let data = classList.filter(item => {
      const hasAttendance = Number(item.tong_ban_ghi_diem_danh || 0) > 0;
      if (!hasAttendance) return false;

      const tenLop = (item.ten_lop || '').toLowerCase();
      const maLop = (item.ma_lop || '').toLowerCase();
      const keyword = searchTerm.toLowerCase();

      return tenLop.includes(keyword) || maLop.includes(keyword);
    });

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
  const dailyClasses = useMemo(
    () => (Array.isArray(dailyReport?.daily_classes) ? dailyReport.daily_classes : []),
    [dailyReport?.daily_classes]
  );
  const filteredDailyClasses = useMemo(() => {
    if (attendanceStatusFilter === 'all') return dailyClasses;
    if (attendanceStatusFilter === 'checked') {
      return dailyClasses.filter((row) => row.trang_thai_diem_danh === 'Đã điểm danh');
    }
    return dailyClasses.filter((row) => row.trang_thai_diem_danh !== 'Đã điểm danh');
  }, [dailyClasses, attendanceStatusFilter]);
  const warningStudents = Array.isArray(dailyReport?.warnings_students) ? dailyReport.warnings_students : [];
  const warningLecturers = Array.isArray(dailyReport?.warnings_lecturers) ? dailyReport.warnings_lecturers : [];
  const effectiveFromDate = dailyReport?.from_ngay || selectedDate;
  const effectiveToDate = dailyReport?.to_ngay || selectedDate;
  const showDateColumn = dateFilterMode !== 'day';

  if (loading && !selectedClass && semesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-bold animate-pulse">ĐANG TẢI DỮ LIỆU THỐNG KÊ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen font-sans text-slate-900">
      
      {selectedClass ? (
        /* ======================== GIAO DIỆN CHI TIẾT ======================== */
        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4">
          <button 
            onClick={() => setSelectedClass(null)} 
            className="flex items-center gap-2 font-bold text-slate-600 bg-white px-5 py-2.5 rounded-2xl border hover:text-blue-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} /> Quay lại danh sách
          </button>
          
          <div className="bg-white p-6 md:p-8 rounded-4xl shadow-sm border border-slate-200">
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
                    <div className="bg-slate-50 p-4 rounded-2xl  flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><User size={24}/></div>
                        <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giảng viên</p><p className="text-sm font-black">{selectedClass.giang_vien}</p></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl  flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm"><Users size={24}/></div>
                      <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lớp hành chính</p><p className="text-sm font-black truncate w-32" title={lopHanhChinhDisplay}>{lopHanhChinhDisplay}</p></div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 sticky left-0 bg-slate-50 z-20 w-64 font-black text-slate-600">Sinh viên</th>
                            <th className="px-4 py-4 text-center  w-24 font-black text-slate-600">% Vắng</th>
                            <th className="px-4 py-4 text-center w-28 font-black text-slate-600">Hành động</th>
                            {danhSachSinhVien[0]?.history?.map((h, i) => (
                                <th key={i} className="px-3 py-4 text-center text-[10px] font-mono  min-w-[85px] text-slate-400 uppercase">
                                    {new Date(h.ngay).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                          {danhSachSinhVien.map(sv => (
                            <tr key={sv.sinhvien_id} className={`group hover:bg-slate-50 transition-colors ${sv.canh_bao ? 'bg-red-50/30' : ''}`}>
                                <td className={`px-6 py-4 sticky left-0 z-10  shadow-sm font-medium ${sv.canh_bao ? 'bg-red-50 text-red-900' : 'bg-white group-hover:bg-slate-50 text-slate-700'}`}>
                                    <div className="font-bold">{sv.ten_sv}</div>
                                    <div className="text-[10px] opacity-60 font-mono italic">{sv.ma_sv}</div>
                                </td>
                                <td className={`px-4 py-4 text-center font-black  ${sv.canh_bao ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>{sv.ti_le_vang}%</td>
                                <td className="px-4 py-4 text-center">
                                  {sv.canh_bao ? (
                                    <button
                                      type="button"
                                      onClick={() => handleNotifyTeacher({
                                        sinhvien_id: sv.sinhvien_id,
                                        lophocphan_id: selectedClass.lophocphan_id,
                                        ten_sv: sv.ten_sv,
                                        ma_sv: sv.ma_sv,
                                        ti_le_vang: sv.ti_le_vang,
                                        ten_lop: selectedClass.ten_lophocphan,
                                        ma_lop: selectedClass.ma_lop
                                      })}
                                      disabled={notifiedStudents.has(`${sv.sinhvien_id}-${selectedClass.lophocphan_id}`)}
                                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                        notifiedStudents.has(`${sv.sinhvien_id}-${selectedClass.lophocphan_id}`)
                                          ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                          : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                                      }`}
                                    >
                                      {notifiedStudents.has(`${sv.sinhvien_id}-${selectedClass.lophocphan_id}`) ? 'Đã báo' : 'Báo GV'}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">OK</span>
                                  )}
                                </td>
                                {sv.history?.map((h, i) => (
                                    <td key={i} className="px-3 py-4 text-center  last:border-0">
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
          <div className="grid grid-cols-1 gap-6">
            
            {/* CỘT TRÁI: ĐIỀU KHIỂN & BIỂU ĐỒ */}
            <div className="space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-4xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 flex-wrap">
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
                      <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setDateFilterMode('day')}
                          className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${dateFilterMode === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Theo ngày
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateFilterMode('week')}
                          className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${dateFilterMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Theo tuần
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateFilterMode('range')}
                          className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${dateFilterMode === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Từ ngày - đến ngày
                        </button>
                      </div>

                      {dateFilterMode === 'day' ? (
                        <div className="relative w-full sm:w-auto">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="date"
                            value={selectedDate}
                            min={semesterStartDate || undefined}
                            max={semesterEndDate || undefined}
                            onChange={(e) => setSelectedDate(clampDateString(e.target.value, semesterStartDate, semesterEndDate))}
                            className="pl-10 pr-3 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-44 transition-all"
                          />
                        </div>
                      ) : dateFilterMode === 'week' ? (
                        <div className="relative w-full sm:w-auto">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            className="pl-10 pr-8 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-fit min-w-[260px] transition-all cursor-pointer"
                          >
                            {semesterWeekOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="relative w-full sm:w-auto">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="date"
                              value={selectedFromDate}
                              min={semesterStartDate || undefined}
                              max={semesterEndDate || undefined}
                              onChange={(e) => setSelectedFromDate(clampDateString(e.target.value, semesterStartDate, semesterEndDate))}
                              className="pl-10 pr-3 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-44 transition-all"
                            />
                          </div>
                          <span className="text-slate-400 text-xs font-bold">đến</span>
                          <div className="relative w-full sm:w-auto">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="date"
                              value={selectedToDate}
                              min={semesterStartDate || undefined}
                              max={semesterEndDate || undefined}
                              onChange={(e) => setSelectedToDate(clampDateString(e.target.value, semesterStartDate, semesterEndDate))}
                              className="pl-10 pr-3 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-44 transition-all"
                            />
                          </div>
                        </div>
                      )}
                      <div className="relative w-full sm:w-auto">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                          value={selectedBoMon}
                          onChange={(e) => setSelectedBoMon(e.target.value)}
                          className="pl-10 pr-8 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-52 transition-all cursor-pointer"
                        >
                          <option value="all">Tất cả bộ môn</option>
                          {boMonOptions.map((bm) => {
                            const boMonId = bm.bomon_id || bm.chuyennganh_id;
                            const boMonName = bm.ten_bomon || bm.ten_chuyennganh;
                            return (
                            <option key={boMonId} value={boMonId}>
                              {boMonName}
                            </option>
                            );
                          })}
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
                      <select
                        value={attendanceStatusFilter}
                        onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-100 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-auto transition-all cursor-pointer"
                      >
                        <option value="all">Tất cả trạng thái điểm danh</option>
                        <option value="checked">Đã điểm danh</option>
                        <option value="unchecked">Chưa điểm danh</option>
                      </select>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {dateFilterMode === 'week' ? 'Lớp học phần trong tuần' : 'Lớp học phần trong ngày'}
                    </p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{filteredDailyClasses.length}</p>
                  </div>
                  <div className="rounded-2xl ed-100 bg-red-50 p-4">
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
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                        {dateFilterMode !== 'day'
                        ? `Kết quả điểm danh theo tuần (${toYmd(effectiveFromDate)} đến ${toYmd(effectiveToDate)})`
                        : `Kết quả điểm danh theo ngày (${toYmd(selectedDate)})`}
                    </h4>
                    {dailyLoading && <Loader2 size={16} className="animate-spin text-blue-600" />}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white border-b border-slate-100 text-slate-500">
                        <tr>
                          {showDateColumn && <th className="px-4 py-3 text-center font-bold">Ngày</th>}
                          <th className="px-4 py-3 text-left font-bold">Lớp học phần</th>
                          <th className="px-4 py-3 text-left font-bold">Giảng viên</th>
                          <th className="px-4 py-3 text-center font-bold">Tiết</th>
                          <th className="px-4 py-3 text-center font-bold">Đã điểm danh</th>
                          <th className="px-4 py-3 text-center font-bold">% Vắng buổi</th>
                          <th className="px-4 py-3 text-center font-bold">Trạng thái</th>
                          <th className="px-4 py-3 text-center font-bold">Quá trình</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDailyClasses.map((row) => (
                          <tr key={row.buoi_id}>
                            {showDateColumn && (
                              <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500">
                                {row.ngay ? new Date(row.ngay).toLocaleDateString('vi-VN') : 'N/A'}
                              </td>
                            )}
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
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => row.lophocphan_id && handleViewDetail(row.lophocphan_id)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                Xem quá trình
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredDailyClasses.length === 0 && (
                          <tr>
                            <td colSpan={showDateColumn ? 8 : 7} className="px-4 py-6 text-center text-slate-400">
                              {showDateColumn ? 'Không có lớp học phần trong khoảng thời gian đã chọn.' : 'Không có lớp học phần trong ngày đã chọn.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl border border-red-100 overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-red-50 flex justify-between items-center">
                      <span className="text-xs font-black text-red-600 uppercase tracking-wider">Cảnh báo sinh viên nghỉ quá 20%</span>
                      {warningStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={handleNotifyAll}
                          disabled={notifyingAll}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-55"
                        >
                          {notifyingAll ? 'Đang gửi...' : 'Gửi tất cả'}
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-auto divide-y divide-slate-100">
                      {warningStudents.length > 0 ? warningStudents.map((w, idx) => {
                        const key = `${w.sinhvien_id}-${w.lophocphan_id}`;
                        const isNotified = notifiedStudents.has(key);
                        return (
                          <div key={`${w.sinhvien_id}-${idx}`} className="px-4 py-3 text-xs flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="font-bold text-slate-700">{w.ten_sv} ({w.ma_sv})</p>
                              <p className="text-slate-500">{w.ten_lop} - {w.ma_lop}</p>
                              <p className="font-black text-red-600 mt-1">Tỷ lệ vắng: {w.ti_le_vang}%</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNotifyTeacher(w)}
                              disabled={isNotified}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                isNotified
                                  ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                              }`}
                            >
                              {isNotified ? 'Đã gửi' : 'Báo GV'}
                            </button>
                          </div>
                        );
                      }) : <p className="px-4 py-4 text-xs text-slate-400">Chưa có cảnh báo.</p>}
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

          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceStats;