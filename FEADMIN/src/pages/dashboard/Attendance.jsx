'use strict';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard, CheckCircle2, Clock, AlertOctagon,
  Search, Filter, Calendar, FileSpreadsheet, X,
  Download, ChevronLeft, ChevronRight, Eye,
  UploadCloud, BookOpen, ChevronDown, Loader2, AlertTriangle, RefreshCw,
  MapPin
} from 'lucide-react';

import hocKyService from '../../service/hockyService.js';
import diemdanhService from '../../service/diemdanhService';
import phanCongService from '../../service/phancongService';
import dashboardService from '../../service/dashboardService';
import AttendanceTable from '../../components/attendances/AttendanceTable';
import SemesterSelector from '../../components/assign/SemesterSelector';
import WeekSelector from '../../components/assign/WeekSelector';

// --- 1. CÁC HÀM XỬ LÝ NGÀY THÁNG AN TOÀN ---

const formatDateVN = (date) => {
  if (!date) return '--/--';
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateShort = (date) => {
  if (!date) return '--/--';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const clampDateString = (value, min, max) => {
  if (!value) return min || max || '';
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
};

const parseDateOnlyLocal = (dateValue) => {
  if (!dateValue) return null;
  const normalized = String(dateValue).slice(0, 10);
  const [y, m, d] = normalized.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

const pickDefaultSemesterIdByTime = (semesterList = []) => {
  if (!Array.isArray(semesterList) || semesterList.length === 0) return '';
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const currentSemester = semesterList.find((sem) => {
    const start = parseDateOnlyLocal(sem.ngay_batdau);
    const end = parseDateOnlyLocal(sem.ngay_ketthuc);
    return start && end && now >= start && now <= end;
  });
  if (currentSemester?.hocky_id) return currentSemester.hocky_id;
  const sortedByStartDesc = [...semesterList].sort((a, b) => {
    const aStart = parseDateOnlyLocal(a.ngay_batdau)?.getTime() || 0;
    const bStart = parseDateOnlyLocal(b.ngay_batdau)?.getTime() || 0;
    return bStart - aStart;
  });
  const nearestPastSemester = sortedByStartDesc.find((sem) => {
    const start = parseDateOnlyLocal(sem.ngay_batdau);
    return start && start <= now;
  });
  return nearestPastSemester?.hocky_id || sortedByStartDesc[0]?.hocky_id || '';
};

const generateSemesterWeeks = (ngay_monday_tuan_1, ngay_ketthuc, tuanBatDau = 1) => {
  if (!ngay_monday_tuan_1 || !ngay_ketthuc) return [];
  const weeks = [];
  const [sy, sm, sd] = ngay_monday_tuan_1.split('-').map(Number);
  let currentMonday = new Date(sy, sm - 1, sd);
  currentMonday.setHours(0, 0, 0, 0);
  const [ey, em, ed] = ngay_ketthuc.split('-').map(Number);
  const endDate = new Date(ey, em - 1, ed);
  endDate.setHours(23, 59, 59, 999);
  let weekNum = tuanBatDau;
  while (currentMonday <= endDate && weekNum <= tuanBatDau + 51) {
    const nextSunday = new Date(currentMonday);
    nextSunday.setDate(currentMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);
    weeks.push({
      id: weekNum,
      label: `Tuần ${weekNum}`,
      rangeText: `(${formatDateShort(currentMonday)} - ${formatDateShort(nextSunday)})`,
      startDate: new Date(currentMonday),
      endDate: new Date(nextSunday)
    });
    currentMonday.setDate(currentMonday.getDate() + 7);
    weekNum++;
  }
  return weeks;
};

const toLocalDate = (dateValue) => {
  if (!dateValue) return null;
  const normalized = String(dateValue).slice(0, 10);
  const [y, m, d] = normalized.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

const formatDateToYYYYMMDD = (d) => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- 3. COMPONENTS CON (GIỮ NGUYÊN GIAO DIỆN) ---
const StatCard = ({ title, value, subLabel, icon, variant, onClick, className = '' }) => {
  const styles = {
    blue: { bgIcon: 'bg-blue-100', textVal: 'text-slate-800', iconColor: 'text-blue-600' },
    green: { bgIcon: 'bg-emerald-100', textVal: 'text-emerald-700', iconColor: 'text-emerald-600' },
    orange: { bgIcon: 'bg-amber-100', textVal: 'text-slate-800', iconColor: 'text-amber-600' },
    red: { bgIcon: 'bg-rose-100', textVal: 'text-rose-700', iconColor: 'text-rose-600' }
  };
  const style = styles[variant] || styles.blue;
  const IconComp = icon;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-5 border border-slate-100 flex items-center justify-between hover:-translate-y-1 duration-300 ${className}`}
    >
      <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p><h3 className={`text-2xl font-extrabold ${style.textVal}`}>{value}</h3><p className="text-xs text-slate-400 font-medium mt-1">{subLabel}</p></div>
      <div className={`w-12 h-12 rounded-xl ${style.bgIcon} flex items-center justify-center ${style.iconColor}`}><IconComp size={24} strokeWidth={2} /></div>
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
  if (typeof document === 'undefined') return null;

  const handleFileChange = (e) => { if (e.target.files[0]) setFile(e.target.files[0]); };

  const handleDownloadTemplate = () => {
    const worksheetData = [
      ["TRƯỜNG ĐHSPKT HƯNG YÊN", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
      ["KHOA CÔNG NGHỆ THÔNG TIN", "", "", "", "Độc lập - Tự do - Hạnh phúc"],
      ["", "", "", "", ""],
      ["", "", "", "MẪU IMPORT ĐIỂM DANH SINH VIÊN"],
      [],
      [`Lớp học phần: ${sessionData?.ten_mon || 'N/A'}`],
      [`Mã lớp: ${sessionData?.ma_lop_hp || ''}`],
      [`Ngày điểm danh: ${sessionData?.ngay || ''}`],
      [],
      ["STT", "Mã SV", "Họ Tên", "Lớp HC", "Trạng thái", "Ghi chú"]
    ];

    // Dữ liệu mẫu
    const sampleData = [
      [1, "12345678", "Nguyễn Văn A", "125251", "Có mặt", ""],
      [2, "12345679", "Trần Thị B", "125251", "Vắng không phép", "Nghỉ không lý do"],
      [3, "12345680", "Lê Văn C", "125251", "Vắng có phép", "Ốm có giấy xác nhận"],
      [4, "12345681", "Phạm Thị D", "125251", "Đi muộn", "Vào muộn 15p"]
    ];

    const finalData = [...worksheetData, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
    ];

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },
      { s: { r: 3, c: 3 }, e: { r: 3, c: 5 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Diem_Danh");
    XLSX.writeFile(wb, `Mau_Import_Diem_Danh_${sessionData?.ma_lop_hp || 'Template'}.xlsx`);
  };

  const handleSave = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert(`Đã cập nhật dữ liệu cho lớp ${sessionData?.ma_lop_hp}`);
      onClose();
    }, 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Import điểm danh</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tải lên file Excel mẫu đã điền thông tin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template Download Section */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-800">Bạn chưa có file mẫu?</p>
                <p className="text-[11px] text-blue-600 font-medium">Tải ngay mẫu chuẩn để nhập dữ liệu</p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-white text-blue-600 text-xs font-bold border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              Tải file mẫu
            </button>
          </div>

          {/* Dropzone */}
          <div
            onClick={() => !file && fileInputRef.current.click()}
            className={`
                border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer relative group
                ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-[#3B5998] hover:bg-slate-50/50'}
              `}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
            {file ? (
              <div className="animate-in zoom-in duration-300">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB • Sẵn sàng import</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-4 text-xs font-bold text-rose-500 hover:text-rose-600 underline"
                >
                  Chọn file khác
                </button>
              </div>
            ) : (
              <div className="py-2">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:text-[#3B5998] group-hover:bg-blue-50 transition-all duration-300">
                  <UploadCloud size={32} />
                </div>
                <p className="text-sm font-bold text-slate-700">Kéo thả file hoặc click để tải lên</p>
                <p className="text-xs text-slate-400 mt-2">Hỗ trợ định dạng .xlsx, .xls</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 px-8">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={!file || isProcessing}
            className={`
                px-8 py-2.5 text-sm font-bold text-white bg-[#3B5998] rounded-xl shadow-lg shadow-[#3B5998]/20 flex items-center gap-2 transition-all
                ${(!file || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2d4373] active:scale-95'}
              `}
          >
            {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
            {isProcessing ? 'Đang xử lý...' : 'Xác nhận Import'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const LoadingOverlay = ({ message = "Đang xử lý dữ liệu..." }) => {
  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/25 flex items-center justify-center backdrop-blur-[1px]">
      <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-4">
        <Loader2 className="animate-spin text-[#3B5998]" size={24} />
        <span className="text-sm font-semibold">{message}</span>
      </div>
    </div>,
    document.body
  );
};

// --- 4. MAIN PAGE ---
const AttendancePagegggg = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [_isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [semesters, setSemesters] = useState([]);
  const [currentSemesterId, setCurrentSemesterId] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  // quản lý modal chi tiết điểm danh
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageSession, setManageSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [scheduleSessions, setScheduleSessions] = useState([]);
  const [warningStudents, setWarningStudents] = useState([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [dateFilterMode, setDateFilterMode] = useState('day');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [notifiedStudents, setNotifiedStudents] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(15);
  const [warningVisibleCount, setWarningVisibleCount] = useState(15);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, warning: 0 });
  const fetchedKeysRef = useRef(new Set());

  const currentSemester = useMemo(() => {
    return semesters.find(s => s.hocky_id === currentSemesterId) || null;
  }, [semesters, currentSemesterId]);

  const semesterStartDate = currentSemester?.ngay_batdau ? currentSemester.ngay_batdau.slice(0, 10) : '';
  const semesterEndDate = currentSemester?.ngay_ketthuc ? currentSemester.ngay_ketthuc.slice(0, 10) : '';

  useEffect(() => {
    if (!semesterStartDate || !semesterEndDate) return;

    setSelectedDate((prev) => clampDateString(prev, semesterStartDate, semesterEndDate));
    setFromDate((prev) => clampDateString(prev, semesterStartDate, semesterEndDate));
    setToDate((prev) => clampDateString(prev, semesterStartDate, semesterEndDate));
  }, [semesterStartDate, semesterEndDate]);

  // Reset pagination và cache khi đổi các bộ lọc chính
  useEffect(() => {
    setVisibleCount(15);
    setWarningVisibleCount(15);
    fetchedKeysRef.current.clear();
    setAttendanceMap({});
  }, [currentSemesterId, selectedWeekId, dateFilterMode, selectedDate, fromDate, toDate]);

  // Reset pagination khi nhập tìm kiếm hoặc đổi filter tab
  useEffect(() => {
    setVisibleCount(15);
    setWarningVisibleCount(15);
  }, [searchTerm, filterStatus]);

  // Trạng thái modal xem quá trình điểm danh
  const [attendanceDetail, setAttendanceDetail] = useState(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  useEffect(() => {
    if (!isAttendanceModalOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAttendanceModalOpen]);

  const handleViewAttendanceProcess = async (item) => {
    if (!item?.lophocphan_id) {
      alert('Không tìm thấy thông tin lớp học phần để xem điểm danh.');
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const res = await dashboardService.getClassDetailAttendance(item.lophocphan_id);
      if (res?.success) {
        setAttendanceDetail({
          ...res.data,
          buoi_hoc: {
            ngay: item.ngay,
            tiet_hien_thi: item.ca_hoc || item.tiet || (item.tiet_bat_dau && item.so_tiet ? `${item.tiet_bat_dau}-${item.tiet_bat_dau + item.so_tiet - 1}` : 'N/A'),
            phong: item.phong || item.phong_hoc || 'N/A',
          },
        });
        setIsAttendanceModalOpen(true);
      } else {
        alert(res?.message || 'Không thể tải chi tiết điểm danh.');
      }
    } catch (error) {
      console.error('Lỗi lấy quá trình điểm danh:', error);
      alert('Không thể tải chi tiết điểm danh.');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleCloseAttendanceModal = () => {
    setIsAttendanceModalOpen(false);
    setAttendanceDetail(null);
  };

  const handleNotifyTeacher = async (w, classIdFromDetail = null) => {
    try {
      const targetClassId = classIdFromDetail || w?.lophocphan_id || manageSession?.lophocphan_id;
      if (!targetClassId) {
        alert('Không tìm thấy thông tin lớp học phần.');
        return;
      }
      const key = `${w.sinhvien_id}-${targetClassId}`;
      const res = await dashboardService.notifyStudentWarning(w.sinhvien_id, targetClassId, w.ti_le_vang);
      if (res.success) {
        setNotifiedStudents(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        alert(`Đã gửi thông báo cảnh báo sinh viên ${w.ten_sv || w.ho_ten || w.ten} đến các giảng viên liên quan thành công!`);
      } else {
        alert(res.message || 'Gửi thông báo thất bại');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Lỗi kết nối khi gửi thông báo.');
    }
  };

  // 1. Fetch Học Kỳ — chọn học kỳ hiện tại giống lịch trình giảng dạy
  useEffect(() => {
    const fetchSemesters = async () => {
      setIsLoading(true);
      try {
        const res = await hocKyService.getAll();
        const data = res.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setSemesters(data);
          setCurrentSemesterId(pickDefaultSemesterIdByTime(data));
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
  useEffect(() => {
    if (!currentSemesterId || semesters.length === 0) return;

    const sem = semesters.find(s => s.hocky_id === currentSemesterId);
    if (sem && sem.ngay_monday_tuan_1 && sem.ngay_ketthuc) {
      const tuanBatDau = sem.tuan_bat_dau_co_lich || 1;
      const generated = generateSemesterWeeks(sem.ngay_monday_tuan_1, sem.ngay_ketthuc, tuanBatDau);
      setWeeks(generated);

      // Mặc định chọn tuần chứa hôm nay; nếu không có thì tuần đầu của học kỳ
      if (generated.length > 0) {
        const today = new Date();
        const foundWeek = generated.find(w => today >= w.startDate && today <= w.endDate);
        setSelectedWeekId(foundWeek ? foundWeek.id : (generated[0]?.id ?? tuanBatDau));
      }
    }
  }, [currentSemesterId, semesters]);

  // 2.1 Lấy danh sách lịch theo học kỳ + bộ lọc thời gian (backend)
  useEffect(() => {
    if (!currentSemesterId) return;
    let isActive = true;

    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const params = { hocky_id: currentSemesterId };
        if (dateFilterMode === 'week' && selectedWeekId && weeks.length > 0) {
          const currentWeekObj = weeks.find(w => w.id === Number(selectedWeekId));
          if (currentWeekObj) {
            params.from_date = formatDateToYYYYMMDD(currentWeekObj.startDate);
            params.to_date = formatDateToYYYYMMDD(currentWeekObj.endDate);
          }
        } else if (dateFilterMode === 'day' && selectedDate) {
          params.from_date = selectedDate;
          params.to_date = selectedDate;
        } else if (dateFilterMode === 'range' && fromDate && toDate) {
          params.from_date = fromDate;
          params.to_date = toDate;
        }

        const res = await phanCongService.getAll(params);
        const rows = res?.data || [];

        if (res?.stats && isActive) {
          setStats(res.stats);
        }

        const normalized = Array.isArray(rows) ? rows.map((item) => {
          const ngay = item.ngay || item.ngay_hoc || '';
          const ca_hoc = item.tiet_hien_thi || (item.tiet_bat_dau && item.tiet_ket_thuc
            ? `${item.tiet_bat_dau} - ${item.tiet_ket_thuc} (${item.so_tiet || ''} tiết)`
            : '');
          const giang_vien = item.giang_vien_day_thay || item.ten_giang_vien || 'Chưa rõ';
          return {
            id: item.buoi_id || `${item.lophocphan_id || 'lhp'}-${ngay}`,
            buoi_id: item.buoi_id,
            lophocphan_id: item.lophocphan_id,
            ma_lop_hp: item.ma_mon || item.lophocphan_id || item.buoi_id,
            ten_mon: item.ten_mon || item.ten_lop_hp || 'Chưa rõ môn',
            giang_vien,
            email_gv: item.email_gv || '',
            phong: item.phong || 'Chưa xếp phòng',
            ca_hoc,
            si_so: item.si_so || 0,
            da_diem_danh: item.da_diem_danh || 0,
            trang_thai: item.trang_thai || 'pending',
            ngay,
            cac_lop_hanh_chinh: item.cac_lop_hanh_chinh || ''
          };
        }) : [];

        if (isActive) {
          setScheduleSessions(normalized);
        }
      } catch (error) {
        console.error('Lỗi lấy lịch học:', error);
        if (isActive) {
          setScheduleSessions([]);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchSessions();
    return () => { isActive = false; };
  }, [currentSemesterId, dateFilterMode, selectedDate, fromDate, toDate, selectedWeekId, weeks]);

  // Lazy load danh sách cảnh báo vắng khi chuyển sang tab 'warning' (luôn theo học kỳ)
  useEffect(() => {
    let isActive = true;
    if (filterStatus === 'warning' && currentSemesterId) {
      const fetchWarningsList = async () => {
        setWarningsLoading(true);
        try {
          const params = { hocky_id: currentSemesterId, get_warnings: true };
          const res = await phanCongService.getAll(params);
          if (isActive) {
            setWarningStudents(res?.warnings_students || []);
          }
        } catch (error) {
          console.error('Lỗi lấy danh sách cảnh báo vắng:', error);
          if (isActive) setWarningStudents([]);
        } finally {
          if (isActive) setWarningsLoading(false);
        }
      };
      fetchWarningsList();
    }
    return () => { isActive = false; };
  }, [filterStatus, currentSemesterId]);

  const isInDateScope = useCallback((item) => {
    const d = toLocalDate(item.ngay);
    if (!d) return false;

    if (dateFilterMode === 'day') {
      const day = toLocalDate(selectedDate);
      return day && d.toDateString() === day.toDateString();
    }

    if (dateFilterMode === 'range') {
      const from = toLocalDate(fromDate);
      const to = toLocalDate(toDate);
      if (!from || !to) return false;
      return d >= from && d <= to;
    }

    const currentWeekObj = weeks.find(w => w.id === Number(selectedWeekId));
    if (!currentWeekObj) return false;
    return d >= currentWeekObj.startDate && d <= currentWeekObj.endDate;
  }, [dateFilterMode, selectedDate, fromDate, toDate, weeks, selectedWeekId]);

  // 2.2 Thống kê điểm danh (Memoized & Fallback dữ liệu có sẵn từ backend)
  const getAttendanceStats = useCallback((item) => {
    if (item.trang_thai !== 'completed') {
      return {
        total: item.si_so || 0,
        present: 0,
        marked: 0,
        ratio: 0,
        status: 'pending'
      };
    }

    const key = `${item.lophocphan_id}-${item.ngay}`;
    if (attendanceMap[key]) {
      const stats = attendanceMap[key];
      const ratio = stats.total > 0 ? stats.present / stats.total : 0;
      let status = 'pending';
      if (stats.total > 0) {
        if (!stats.marked) status = 'pending';
        else if (stats.marked < stats.total) status = 'pending';
        else if (ratio < 0.8) status = 'warning';
        else status = 'completed';
      }
      return { ...stats, ratio, status };
    }

    // Fallback sử dụng dữ liệu có sẵn từ backend khi chưa lazy-load
    const total = item.si_so || 0;
    const present = item.da_diem_danh || 0;
    const ratio = total > 0 ? present / total : 0;

    let status = item.trang_thai || 'pending';
    if (status === 'completed' && ratio < 0.8) {
      status = 'warning';
    }

    return {
      total,
      present,
      marked: item.trang_thai === 'completed' ? total : 0,
      ratio,
      status
    };
  }, [attendanceMap]);

  const filteredData = useMemo(() => {
    return scheduleSessions.filter(item => {
      if (!isInDateScope(item)) return false;
      const term = searchTerm.toLowerCase();
      const matchSearch = item.ten_mon.toLowerCase().includes(term) ||
        item.giang_vien.toLowerCase().includes(term) ||
        item.ma_lop_hp.toLowerCase().includes(term);
      const matchStatus = filterStatus === 'all' || getAttendanceStats(item).status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [searchTerm, filterStatus, scheduleSessions, getAttendanceStats, isInDateScope]);

  const filteredWarningData = useMemo(() => {
    if (!searchTerm) return warningStudents;
    const term = searchTerm.toLowerCase();
    return warningStudents.filter(item => {
      return (item.ten_sv || '').toLowerCase().includes(term) ||
        (item.ma_sv || '').toLowerCase().includes(term) ||
        (item.ten_lop || '').toLowerCase().includes(term) ||
        (item.ma_lop || '').toLowerCase().includes(term) ||
        (item.giang_vien || '').toLowerCase().includes(term);
    });
  }, [warningStudents, searchTerm]);

  const visibleWarningData = useMemo(() => {
    return filteredWarningData.slice(0, warningVisibleCount);
  }, [filteredWarningData, warningVisibleCount]);

  const visibleData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  // Infinite scroll — dùng 2 counter tách biệt nên không bị race condition
  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 150;
      if (!nearBottom) return;
      if (filterStatus === 'warning') {
        setWarningVisibleCount(prev =>
          prev < filteredWarningData.length ? prev + 15 : prev
        );
      } else {
        setVisibleCount(prev =>
          prev < filteredData.length ? prev + 15 : prev
        );
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filterStatus, filteredWarningData.length, filteredData.length]);

  // 2.3 Lazy load thống kê điểm danh cho các lớp đang hiển thị trên màn hình
  useEffect(() => {
    const toFetch = visibleData.filter(session => {
      const key = `${session.lophocphan_id}-${session.ngay}`;
      return !fetchedKeysRef.current.has(key);
    });

    if (toFetch.length === 0) {
      return;
    }

    let isActive = true;
    const fetchCounts = async () => {
      try {
        const results = await Promise.all(toFetch.map(async (session) => {
          if (!session.lophocphan_id || !session.ngay) return null;
          const key = `${session.lophocphan_id}-${session.ngay}`;

          fetchedKeysRef.current.add(key);

          try {
            const res = await diemdanhService.get({ lophocphan_id: session.lophocphan_id, ngay: session.ngay });
            const payload = res?.data || res;
            const data = payload?.data || payload;
            const list = data?.danh_sach_sinh_vien || data?.danh_sach || [];
            const total = Array.isArray(list) ? list.length : 0;
            const marked = Array.isArray(list)
              ? list.filter(sv => sv.trangthai).length
              : 0;
            const present = Array.isArray(list)
              ? list.filter(sv => ['present', 'late', 'excused'].includes(sv.trangthai)).length
              : 0;
            return { key, total, present, marked };
          } catch (err) {
            console.error('Lỗi lấy điểm danh:', err);
            return { key, total: 0, present: 0, marked: 0 };
          }
        }));

        if (!isActive) return;
        const newResults = results.filter(Boolean);
        if (newResults.length > 0) {
          setAttendanceMap(prev => {
            const nextMap = { ...prev };
            newResults.forEach((r) => { nextMap[r.key] = r; });
            return nextMap;
          });
        }
      } catch (err) {
        console.error('Lỗi lấy thống kê điểm danh:', err);
      }
    };

    fetchCounts();
    return () => { isActive = false; };
  }, [visibleData]);

  // 2.4 Auto scroll load more
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200
      ) {
        setVisibleCount(prev => Math.min(prev + 15, filteredData.length));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredData.length]);



  const handlePrevWeek = () => {
    const currentIdx = weeks.findIndex(w => w.id === Number(selectedWeekId));
    if (currentIdx > 0) setSelectedWeekId(weeks[currentIdx - 1].id);
  };

  const handleNextWeek = () => {
    const currentIdx = weeks.findIndex(w => w.id === Number(selectedWeekId));
    if (currentIdx !== -1 && currentIdx < weeks.length - 1) setSelectedWeekId(weeks[currentIdx + 1].id);
  };


  return (
    <div className="min-h-screen font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* HEADER (GIỮ NGUYÊN GIAO DIỆN) */}
        <div className="flex flex-col xl:flex-row justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Kiểm Soát Điểm Danh</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Trung tâm điều hành đào tạo</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            {/* Bộ lọc thời gian */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              {[{ id: 'week', label: 'Theo tuần' }, { id: 'day', label: 'Theo ngày' }, { id: 'range', label: 'Từ ngày - đến ngày' }].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setDateFilterMode(mode.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${dateFilterMode === mode.id ? 'bg-white text-[#3B5998] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
              {/* Học kỳ Selector */}
              <div className="flex items-center gap-3">
                <SemesterSelector semesters={semesters} currentSemesterId={currentSemesterId} onChange={setCurrentSemesterId} />
              </div>

              {/* Thời gian theo chế độ lọc */}
              {dateFilterMode === 'week' && (
                <div className="flex items-center">
                  <WeekSelector
                    weeks={weeks}
                    selectedWeekId={Number(selectedWeekId)}
                    onChange={(id) => setSelectedWeekId(Number(id))}
                    onPrev={handlePrevWeek}
                    onNext={handleNextWeek}
                    canGoPrev={!(weeks.length === 0 || Number(selectedWeekId) === weeks[0]?.id)}
                    canGoNext={!(weeks.length === 0 || Number(selectedWeekId) === weeks[weeks.length - 1]?.id)}
                  />
                </div>
              )}

              {dateFilterMode === 'day' && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                  <div className="p-1 bg-green-50 text-green-600 rounded">
                    <Calendar size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thời gian</p>
                    <p className="font-bold text-gray-700 text-sm truncate">Theo ngày</p>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    min={semesterStartDate || undefined}
                    max={semesterEndDate || undefined}
                    onChange={(e) => setSelectedDate(clampDateString(e.target.value, semesterStartDate, semesterEndDate))}
                    className="ml-2 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm font-semibold text-slate-700"
                  />
                </div>
              )}

              {dateFilterMode === 'range' && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                  <div className="p-1 bg-green-50 text-green-600 rounded">
                    <Calendar size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thời gian</p>
                    <p className="font-bold text-gray-700 text-sm truncate">Từ ngày - đến ngày</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="date"
                      value={fromDate}
                      min={semesterStartDate || undefined}
                      max={semesterEndDate || undefined}
                      onChange={(e) => setFromDate(clampDateString(e.target.value, semesterStartDate, semesterEndDate))}
                      className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm font-semibold text-slate-700"
                    />
                    <span className="text-xs text-slate-400 font-semibold">đến</span>
                    <input
                      type="date"
                      value={toDate}
                      min={semesterStartDate || undefined}
                      max={semesterEndDate || undefined}
                      onChange={(e) => setToDate(clampDateString(e.target.value, semesterStartDate, semesterEndDate))}
                      className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm font-semibold text-slate-700"
                    />
                  </div>
                </div>
              )}


            </div>
          </div>

        </div>


        {/* STATS (GIỮ NGUYÊN GIAO DIỆN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Lớp Trong Tuần" value={stats.total} subLabel="Tổng số lớp" icon={LayoutDashboard} variant="blue" onClick={() => setFilterStatus('all')} className="cursor-pointer hover:border-blue-200" />
          <StatCard title="Đã Hoàn Thành" value={stats.completed} subLabel="Đã điểm danh" icon={CheckCircle2} variant="green" onClick={() => setFilterStatus('completed')} className="cursor-pointer hover:border-emerald-200" />
          <StatCard title="Chưa Điểm Danh" value={stats.pending} subLabel="Cần nhắc nhở" icon={Clock} variant="orange" onClick={() => setFilterStatus('pending')} className="cursor-pointer hover:border-amber-200" />
          <StatCard title="Cảnh Báo Vắng" value={stats.warning} subLabel="Vắng > 20%" icon={AlertOctagon} variant="red" onClick={() => setFilterStatus('warning')} className="cursor-pointer hover:border-rose-200" />
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
                {filterStatus === 'warning' ? (
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[20%] tracking-wider">Sinh Viên</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[30%] tracking-wider">Lớp Học Phần / Môn</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[20%] tracking-wider">Giảng Viên</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] text-center tracking-wider">Vắng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] text-right tracking-wider">Tác Vụ</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[35%] tracking-wider">Lớp Học Phần / Môn</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[20%] tracking-wider">Giảng Viên</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] tracking-wider">Thời Gian</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] text-center tracking-wider">Tiến Độ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-[15%] text-right tracking-wider">Tác Vụ</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filterStatus === 'warning' ? (
                  warningsLoading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-[#3B5998] mb-4" />
                          <p className="text-slate-500 font-bold">Đang tải danh sách cảnh báo vắng...</p>
                        </div>
                      </td>
                    </tr>
                  ) : visibleWarningData.length > 0 ? visibleWarningData.map(w => (
                    <tr key={`${w.sinhvien_id}-${w.lophocphan_id}`} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 align-middle">
                        <div className="font-bold text-slate-800 text-base">{w.ten_sv}</div>
                        <div className="font-mono text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded w-fit mt-1">{w.ma_sv}</div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="font-bold text-slate-700">{w.ten_lop}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-400 font-mono">{w.ma_lop}</span>
                          {w.phong && w.phong !== 'N/A' && (
                            <>
                              <span className="text-slate-300 text-xs">|</span>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <MapPin size={12} className="text-slate-400" />
                                <span>{w.phong}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3 pr-4">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 truncate">{w.giang_vien || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <div className="font-black text-rose-600 text-base">{w.so_buoi_vang}/{w.tong_so_buoi}</div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">{w.ti_le_vang}% vắng</div>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        {(() => {
                          const key = `${w.sinhvien_id}-${w.lophocphan_id}`;
                          const isNotified = notifiedStudents.has(key);
                          return (
                            <button
                              onClick={() => handleNotifyTeacher(w)}
                              disabled={isNotified}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isNotified
                                  ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-sm'
                                }`}
                            >
                              {isNotified ? 'Đã báo GV' : 'Báo GV'}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="px-6 py-32 text-center"><div className="flex flex-col items-center justify-center text-slate-300"><Filter size={32} className="mb-2" /><p className="text-slate-600 font-bold text-base">Không có sinh viên cảnh báo vắng</p></div></td></tr>
                  )
                ) : (
                  visibleData.length > 0 ? visibleData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1 pr-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={getAttendanceStats(item).status} />
                            <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-1.5 rounded">{item.ma_lop_hp}</span>
                          </div>
                          <span className="font-bold text-slate-800 text-base line-clamp-2">{item.ten_mon}</span>
                          <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1">
                            <div className="flex items-center gap-1"><MapPin size={12} /> {item.phong}</div>
                            {item.cac_lop_hanh_chinh && (
                              <>
                                <span className="text-slate-300">•</span>
                                <div className="flex items-center gap-1 font-semibold text-[#3B5998]">Lớp HC: {item.cac_lop_hanh_chinh}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3 pr-4">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 truncate">{item.giang_vien}</p>
                            <p className="text-xs text-slate-400 truncate">{item.email_gv}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded w-fit text-xs whitespace-nowrap"><Clock size={12} /> {item.ca_hoc || '--'} </span>
                          <span className="text-xs text-slate-400 pl-1">{formatDateVN(item.ngay)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col items-center w-full max-w-[120px] mx-auto">
                          {(() => {
                            const stats = getAttendanceStats(item);
                            return (
                              <>
                                <div className="flex justify-between w-full mb-1.5"><span className="text-xs font-bold text-slate-700">{stats.present}</span><span className="text-xs text-slate-400">/ {stats.total}</span></div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${stats.ratio < 0.5 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${stats.ratio * 100}%` }}></div></div>
                                <span className="text-[10px] font-medium text-slate-400 mt-1 whitespace-nowrap">{stats.total > 0 ? Math.round(stats.ratio * 100) : 0}% tham gia</span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={async () => {
                            try {
                              setIsLoading(true);
                              // item has lophocphan_id and ngay
                              const res = await diemdanhService.get({ lophocphan_id: item.lophocphan_id, ngay: item.ngay });
                              const payload = res.data || res;
                              const data = payload?.data || payload;
                              const list = data?.danh_sach_sinh_vien || data?.danh_sach || [];
                              setAttendanceData(list.map((r, i) => ({
                                ...r,
                                id: r.sinhvien_id || i,
                                ten: r.ho_ten || r.ten || '',
                                trangthai: r.trangthai || 'present'
                              })));
                              setManageSession(item);
                              setManageModalOpen(true);
                            } catch (err) {
                              console.error('Lỗi lấy điểm danh:', err);
                              alert('Không thể tải dữ liệu điểm danh');
                            } finally { setIsLoading(false); }
                          }} className="p-2 text-slate-500 hover:text-[#3B5998] hover:bg-blue-50 rounded-lg transition-colors" title="Quản lý điểm danh"><Eye size={18} /></button>
                          <button onClick={() => handleViewAttendanceProcess(item)} className="p-2 text-[#3B5998] bg-white hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 hover:border-blue-200 shadow-sm" title="Xem quá trình điểm danh"><Clock size={18} /></button>
                          <button onClick={() => { setSelectedSession(item); setIsModalOpen(true); }} className="p-2 text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 hover:border-emerald-200 shadow-sm" title="Import Excel"><FileSpreadsheet size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="px-6 py-32 text-center"><div className="flex flex-col items-center justify-center text-slate-300"><Filter size={32} className="mb-2" /><p className="text-slate-600 font-bold text-base">Không tìm thấy dữ liệu trong tuần này</p></div></td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          {filterStatus === 'warning' ? (
            warningVisibleCount < filteredWarningData.length && (
              <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                <button
                  onClick={() => setWarningVisibleCount(prev => {
                    const next = Math.min(prev + 15, filteredWarningData.length);
                    return next > prev ? next : prev;
                  })}
                  className="px-6 py-2.5 bg-white text-[#3B5998] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 hover:border-[#3B5998]/50 active:scale-95 duration-200"
                >
                  <Loader2 size={14} className="animate-spin text-[#3B5998]" />
                  Xem thêm ({filteredWarningData.length - warningVisibleCount} sinh viên)
                </button>
              </div>
            )
          ) : (
            visibleCount < filteredData.length && (
              <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                <button
                  onClick={() => setVisibleCount(prev => {
                    const next = Math.min(prev + 15, filteredData.length);
                    return next > prev ? next : prev;
                  })}
                  className="px-6 py-2.5 bg-white text-[#3B5998] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 hover:border-[#3B5998]/50 active:scale-95 duration-200"
                >
                  <Loader2 size={14} className="animate-spin text-[#3B5998]" />
                  Xem thêm ({filteredData.length - visibleCount} lớp)
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Manage attendance modal */}
      {manageModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#3B5998]/10 text-[#3B5998] rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Quản lý điểm danh</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {manageSession?.ten_mon} • <span className="text-[#3B5998] font-bold">{manageSession?.ma_lop_hp}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-6 bg-slate-50/30">
              <AttendanceTable
                data={attendanceData}
                onUpdateStatus={(svId, status) => {
                  setAttendanceData(prev => prev.map(sv => sv.sinhvien_id === svId ? { ...sv, trangthai: status } : sv));
                }}
                onUpdateNote={(svId, note) => {
                  setAttendanceData(prev => prev.map(sv => sv.sinhvien_id === svId ? { ...sv, ghichu: note } : sv));
                }}
                onNotifyTeacher={handleNotifyTeacher}
                notifiedStudents={notifiedStudents}
              />
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center px-8">
              <div className="text-sm text-slate-500 font-medium italic">
                * Dữ liệu chỉ được cập nhật chính thức sau khi nhấn "Lưu thay đổi"
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setManageModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                >
                  Đóng
                </button>
                <button
                  className="px-8 py-2.5 bg-[#3B5998] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#3B5998]/20 hover:bg-[#2d4373] active:scale-95 transition-all flex items-center gap-2"
                  onClick={async () => {
                    if (!manageSession) return;
                    const danh_sach = attendanceData.map(sv => ({
                      sinhvien_id: sv.sinhvien_id,
                      trangthai: sv.trangthai || 'present',
                      ghichu: sv.ghichu || ''
                    }));
                    try {
                      setIsLoading(true);
                      await diemdanhService.save({
                        lophocphan_id: manageSession.lophocphan_id,
                        ngay: manageSession.ngay,
                        danh_sach
                      });

                      // Cập nhật lại attendanceMap để UI ngoài table cũng update
                      const statsRes = await diemdanhService.get({
                        lophocphan_id: manageSession.lophocphan_id,
                        ngay: manageSession.ngay
                      });
                      const payload = statsRes?.data || statsRes;
                      const data = payload?.data || payload;
                      const list = data?.danh_sach_sinh_vien || data?.danh_sach || [];
                      const key = `${manageSession.lophocphan_id}-${manageSession.ngay}`;

                      setAttendanceMap(prev => ({
                        ...prev,
                        [key]: {
                          key,
                          total: list.length,
                          present: list.filter(sv => ['present', 'late', 'excused'].includes(sv.trangthai)).length,
                          marked: list.filter(sv => sv.trangthai).length
                        }
                      }));

                      // Cập nhật lại scheduleSessions và stats cards ngay lập tức
                      setScheduleSessions(prev => {
                        const newSessions = prev.map(s => 
                          s.buoi_id === manageSession.buoi_id || (s.lophocphan_id === manageSession.lophocphan_id && s.ngay === manageSession.ngay)
                            ? { ...s, trang_thai: 'completed', da_diem_danh: list.filter(sv => ['present', 'late', 'excused'].includes(sv.trangthai)).length }
                            : s
                        );
                        
                        let completedCount = 0;
                        let pendingCount = 0;
                        newSessions.forEach(item => {
                          if (item.trang_thai === 'completed') completedCount++;
                          else pendingCount++;
                        });
                        
                        setStats(prevStats => ({
                          ...prevStats,
                          completed: completedCount,
                          pending: pendingCount
                        }));

                        return newSessions;
                      });

                      alert('Lưu điểm danh thành công');
                      setManageModalOpen(false);
                    } catch (err) {
                      console.error(err);
                      alert('Lưu thất bại');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <RefreshCw size={16} className={_isLoading ? "animate-spin" : ""} />
                  {_isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} sessionData={selectedSession} />
      
      {isAttendanceModalOpen && createPortal((
        <div className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-7xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-800">Quá trình điểm danh sinh viên</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {attendanceDetail?.ten_lophocphan} ({attendanceDetail?.ma_lop})
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAttendanceModal}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Giảng viên</p>
                <p className="font-semibold text-slate-700">{attendanceDetail?.giang_vien || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lớp hành chính</p>
                <p className="font-semibold text-slate-700 truncate" title={Array.isArray(attendanceDetail?.lop_hanh_chinh) ? attendanceDetail.lop_hanh_chinh.join(', ') : 'Chưa có dữ liệu'}>
                  {Array.isArray(attendanceDetail?.lop_hanh_chinh) ? attendanceDetail.lop_hanh_chinh.join(', ') : 'Chưa có dữ liệu'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Buổi được chọn</p>
                <p className="font-semibold text-slate-700">
                  {attendanceDetail?.buoi_hoc?.ngay ? new Date(attendanceDetail.buoi_hoc.ngay).toLocaleDateString('vi-VN') : 'N/A'} - {attendanceDetail?.buoi_hoc?.tiet_hien_thi || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cảnh báo nghỉ quá 20%</p>
                <p className="font-black text-red-600 inline-flex items-center gap-1">
                  <AlertTriangle size={14} /> {Array.isArray(attendanceDetail?.danh_sach_sinh_vien) ? attendanceDetail.danh_sach_sinh_vien.filter(sv => sv.canh_bao).length : 0} sinh viên
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[220px] font-bold text-slate-600">Sinh viên</th>
                    <th className="px-4 py-3 text-center border-r border-slate-200 min-w-[120px] font-bold text-slate-600">Số buổi vắng</th>
                    <th className="px-4 py-3 text-center border-r border-slate-200 min-w-[120px] font-bold text-slate-600">Hành động</th>
                    {(Array.isArray(attendanceDetail?.danh_sach_sinh_vien?.[0]?.history) ? attendanceDetail.danh_sach_sinh_vien[0].history : []).map((h, i) => (
                      <th key={i} className="px-3 py-3 text-center text-[10px] font-mono border-r border-slate-200 min-w-[110px] text-slate-500 uppercase">
                        {new Date(h.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Array.isArray(attendanceDetail?.danh_sach_sinh_vien) ? attendanceDetail.danh_sach_sinh_vien : []).map((sv) => {
                    const key = `${sv.sinhvien_id}-${attendanceDetail?.lophocphan_id}`;
                    const isNotified = notifiedStudents.has(key);
                    return (
                      <tr key={sv.sinhvien_id} className={sv.canh_bao ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                        <td className={`px-5 py-3 sticky left-0 z-10 border-r border-slate-200 ${sv.canh_bao ? 'bg-red-50 text-red-900' : 'bg-white text-slate-700'}`}>
                          <div className="font-semibold">{sv.ten_sv}</div>
                          <div className="text-[11px] opacity-70 font-mono">{sv.ma_sv}</div>
                          {sv.canh_bao && <div className="text-[10px] font-bold text-red-600 mt-1">Cảnh báo: Vắng quá 20%</div>}
                        </td>
                        <td className={`px-4 py-3 text-center font-black border-r border-slate-200 ${sv.canh_bao ? 'text-red-600' : 'text-slate-600'}`}>
                          {sv.so_buoi_vang !== undefined ? `${sv.so_buoi_vang}/${sv.tong_so_buoi} buổi` : `${sv.ti_le_vang}%`} ({sv.ti_le_vang}%)
                        </td>
                        <td className="px-4 py-3 text-center border-r border-slate-200">
                          {sv.canh_bao ? (
                            <button
                              type="button"
                              onClick={() => handleNotifyTeacher(sv, attendanceDetail?.lophocphan_id)}
                              disabled={isNotified}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all shadow-sm border ${
                                isNotified
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 cursor-not-allowed"
                                  : "bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200 active:scale-95 border-red-600"
                              }`}
                            >
                              {isNotified ? 'Đã gửi' : 'Báo GV'}
                            </button>
                          ) : (
                            <span className="text-slate-400 font-bold text-xs">-</span>
                          )}
                        </td>
                        {sv.history?.map((h, i) => (
                          <td key={i} className="px-3 py-3 text-center border-r border-slate-200 last:border-r-0">
                            {h.trangthai === 'present' && <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 mx-auto" />}
                            {h.trangthai === 'absent' && <div className="w-3.5 h-3.5 rounded-full bg-red-500 mx-auto" />}
                            {h.trangthai === 'late' && <div className="w-3.5 h-3.5 rounded-full bg-amber-500 mx-auto" />}
                            {h.trangthai === 'excused' && <div className="w-3.5 h-3.5 rounded-full bg-slate-400 mx-auto" />}
                            {h.trangthai === 'not_recorded' && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded whitespace-nowrap">Chưa điểm danh</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {(!attendanceDetail?.danh_sach_sinh_vien || attendanceDetail.danh_sach_sinh_vien.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        Chưa có dữ liệu điểm danh cho lớp học phần này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ), document.body)}

      {isAttendanceLoading && <LoadingOverlay message="Đang tải quá trình điểm danh..." />}
      {_isLoading && <LoadingOverlay />}
    </div>
  );
};

export default AttendancePagegggg;