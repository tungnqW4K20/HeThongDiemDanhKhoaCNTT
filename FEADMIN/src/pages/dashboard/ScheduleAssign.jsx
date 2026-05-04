'use strict';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Search, Plus, Loader2, Upload, ClipboardCheck, X, AlertTriangle
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';

// Components
import SemesterSelector from '../../components/assign/SemesterSelector';
import WeekSelector from '../../components/assign/WeekSelector'; 
import AssignmentTable from '../../components/assign/AssignmentTable';
import AssignmentModal from '../../components/assign/AssignmentModal';
import DeleteConfirmModalSchedule from '../../components/assign/DeleteConfirmModal';
import ImportScheduleModal from '../../components/assign/ImportScheduleModal'; 
import ImportResultModal from '../../components/common/ImportResultModal';

// Services
import phanCongService from '../../service/phancongService';
import hocKyService from '../../service/hockyService'; 
import dashboardService from '../../service/dashboardService';
import khoaService from '../../service/khoaService';
import { useAuth } from '../../hooks/useAuth';
import ProposalView from '../../components/assign/ProposalView.jsx';

// Utility functions (giữ nguyên logic cũ)
const formatDateVN = (date) => {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

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

// const generateWeeksFromSemester = (anchorMondayStr, endDateStr) => {
//     if (!anchorMondayStr || !endDateStr) return [];
//     const weeks = [];
//     let currentMonday = new Date(anchorMondayStr); 
//     const endDate = new Date(endDateStr);
//     let weekIndex = 1;
//     while (currentMonday <= endDate) {
//         const nextSunday = new Date(currentMonday);
//         nextSunday.setDate(currentMonday.getDate() + 6);
//         weeks.push({
//             id: weekIndex,
//             label: `Tuần ${weekIndex}`,
//             rangeText: `(${formatDateVN(currentMonday)} - ${formatDateVN(nextSunday)})`,
//             startDate: new Date(currentMonday),
//             endDate: new Date(nextSunday)
//         });
//         currentMonday.setDate(currentMonday.getDate() + 7);
//         weekIndex++;
//     }
//     return weeks;
// };

const toDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

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
            rangeText: `(${formatDateVN(currentMonday)} - ${formatDateVN(nextSunday)})`,
            startDate: new Date(currentMonday),
            endDate: new Date(nextSunday),
            mondayStr: toDateString(currentMonday)
        });
        currentMonday.setDate(currentMonday.getDate() + 7);
        weekNum++;
    }
    return weeks;
};

export default function AssignmentPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- STATE ĐIỀU HƯỚNG ---
    const [showProposals, setShowProposals] = useState(false);

    // --- STATE DỮ LIỆU ---
    const [currentSemesterId, setCurrentSemesterId] = useState('');
    const [semesters, setSemesters] = useState([]);
    const [assignments, setAssignments] = useState([]); 
    const [weeks, setWeeks] = useState([]); 
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [pendingWeekSelection, setPendingWeekSelection] = useState(null);

    // --- STATE UI & MODAL ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBoMon, setSelectedBoMon] = useState('all');
    const [boMonOptions, setBoMonOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
    const [isImportResultModalOpen, setIsImportResultModalOpen] = useState(false);
    const [importResultSummary, setImportResultSummary] = useState(null);
    const [importSuccessRows, setImportSuccessRows] = useState([]);
    const [importFailedRows, setImportFailedRows] = useState([]);
    const [currentAssignment, setCurrentAssignment] = useState(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const [attendanceDetail, setAttendanceDetail] = useState(null);

    const canViewAttendanceProcess = ['admin', 'lanhdao'].includes(user?.vaitro);

    // --- 1. FETCH DANH SÁCH HỌC KỲ ---
    useEffect(() => {
        const fetchHocKy = async () => {
            try {
                const [hocKyRes, khoaRes] = await Promise.all([
                    hocKyService.getAll(),
                    khoaService.getAllBoMonRaw()
                ]);
                const listHocKy = hocKyRes.data || []; 
                if (listHocKy.length > 0) {
                    setSemesters(listHocKy);
                    setCurrentSemesterId(pickDefaultSemesterIdByTime(listHocKy));
                }

                const boMonList = khoaRes.data?.data || khoaRes.data || [];
                const normalizedBoMon = boMonList
                    .filter((bm) => bm?.bomon_id && (bm?.ten_bomon || bm?.ma_bomon))
                    .map((bm) => ({
                        id: bm.bomon_id,
                        name: bm.ten_bomon || bm.ma_bomon
                    }));
                setBoMonOptions(normalizedBoMon);
            } catch (err) {
                console.error("Lỗi khi load danh sách học kỳ:", err);
            }
        };
        fetchHocKy();
    }, []);

    // --- 2. SINH TUẦN KHI ĐỔI HỌC KỲ ---
    // useEffect(() => {
    //     if (!currentSemesterId || semesters.length === 0) return;
    //     const currentSem = semesters.find(s => s.hocky_id === currentSemesterId);
    //     if (currentSem?.ngay_monday_tuan_1) {
    //         const generatedWeeks = generateWeeksFromSemester(
    //             currentSem.ngay_monday_tuan_1, 
    //             currentSem.ngay_ketthuc
    //         );
    //         setWeeks(generatedWeeks);
    //         setSelectedWeek(1); 
    //     }
    // }, [currentSemesterId, semesters]);

    useEffect(() => {
        if (!currentSemesterId || semesters.length === 0) return;

        // Lấy thông tin học kỳ hiện tại đang chọn
        const currentSem = semesters.find(s => s.hocky_id === currentSemesterId);
        if (!currentSem) return;

        // Sinh tuần theo học kỳ đang chọn, bắt đầu từ tuan_bat_dau_co_lich
        const tuanBatDau = currentSem.tuan_bat_dau_co_lich || 1;
        const weeksOfSem = generateSemesterWeeks(currentSem.ngay_monday_tuan_1, currentSem.ngay_ketthuc, tuanBatDau);
        setWeeks(weeksOfSem);

        // Nếu có tuần chờ chọn (do bấm qua tuần ở kỳ khác), ưu tiên áp dụng trước.
        if (pendingWeekSelection !== null) {
            const hasPendingWeek = weeksOfSem.some(w => w.id === pendingWeekSelection);
            if (hasPendingWeek) {
                setSelectedWeek(pendingWeekSelection);
                setPendingWeekSelection(null);
                return;
            }
            setPendingWeekSelection(null);
        }

        // Auto-chọn tuần hiện tại nếu đang trong học kỳ này
        const now = new Date();
        const currentWeek = weeksOfSem.find(w => now >= w.startDate && now <= w.endDate);
        setSelectedWeek(currentWeek ? currentWeek.id : (weeksOfSem[0]?.id ?? tuanBatDau));
    }, [currentSemesterId, semesters, pendingWeekSelection]);

    const currentSemester = useMemo(
        () => semesters.find(s => s.hocky_id === currentSemesterId) || null,
        [semesters, currentSemesterId]
    );

    const sameSchoolYearSemesters = useMemo(() => {
        if (!currentSemester) return [];

        const currentNamHocId = currentSemester.namhoc_id || currentSemester.NamHoc?.namhoc_id;
        return semesters
            .filter((s) => (s.namhoc_id || s.NamHoc?.namhoc_id) === currentNamHocId)
            .sort((a, b) => new Date(a.ngay_batdau) - new Date(b.ngay_batdau));
    }, [semesters, currentSemester]);

    const currentSemesterIndexInYear = useMemo(
        () => sameSchoolYearSemesters.findIndex(s => s.hocky_id === currentSemesterId),
        [sameSchoolYearSemesters, currentSemesterId]
    );

    const canGoPrevWeek = useMemo(() => {
        const currentIdx = weeks.findIndex(w => w.id === selectedWeek);
        const hasPrevInSemester = currentIdx > 0;
        const hasPrevSemester = currentSemesterIndexInYear > 0;
        return hasPrevInSemester || hasPrevSemester;
    }, [weeks, selectedWeek, currentSemesterIndexInYear]);

    const canGoNextWeek = useMemo(() => {
        const currentIdx = weeks.findIndex(w => w.id === selectedWeek);
        const hasNextInSemester = currentIdx >= 0 && currentIdx < weeks.length - 1;
        const hasNextSemester =
            currentSemesterIndexInYear >= 0 &&
            currentSemesterIndexInYear < sameSchoolYearSemesters.length - 1;
        return hasNextInSemester || hasNextSemester;
    }, [weeks, selectedWeek, currentSemesterIndexInYear, sameSchoolYearSemesters.length]);

    const handleWeekPrev = () => {
        const currentIdx = weeks.findIndex(w => w.id === selectedWeek);
        if (currentIdx > 0) {
            setSelectedWeek(weeks[currentIdx - 1].id);
            return;
        }

        if (currentSemesterIndexInYear > 0) {
            const prevSemester = sameSchoolYearSemesters[currentSemesterIndexInYear - 1];
            const prevWeeks = generateSemesterWeeks(
                prevSemester.ngay_monday_tuan_1,
                prevSemester.ngay_ketthuc,
                prevSemester.tuan_bat_dau_co_lich || 1
            );
            const targetWeekId = prevWeeks[prevWeeks.length - 1]?.id;
            if (targetWeekId != null) setPendingWeekSelection(targetWeekId);
            setCurrentSemesterId(prevSemester.hocky_id);
        }
    };

    const handleWeekNext = () => {
        const currentIdx = weeks.findIndex(w => w.id === selectedWeek);
        if (currentIdx >= 0 && currentIdx < weeks.length - 1) {
            setSelectedWeek(weeks[currentIdx + 1].id);
            return;
        }

        if (currentSemesterIndexInYear >= 0 && currentSemesterIndexInYear < sameSchoolYearSemesters.length - 1) {
            const nextSemester = sameSchoolYearSemesters[currentSemesterIndexInYear + 1];
            const nextWeeks = generateSemesterWeeks(
                nextSemester.ngay_monday_tuan_1,
                nextSemester.ngay_ketthuc,
                nextSemester.tuan_bat_dau_co_lich || 1
            );
            const targetWeekId = nextWeeks[0]?.id;
            if (targetWeekId != null) setPendingWeekSelection(targetWeekId);
            setCurrentSemesterId(nextSemester.hocky_id);
        }
    };

    // --- 3. FETCH DỮ LIỆU PHÂN CÔNG ---
    // useEffect(() => {
    //     if (!currentSemesterId) return;
    //     const fetchAssignments = async () => {
    //         setIsLoading(true);
    //         try {
    //             const res = await phanCongService.getAll({ hocky_id: currentSemesterId });
    //             setAssignments(res.data || []);
    //         } catch (err) {
    //             console.error("Lỗi load dữ liệu phân công", err);
    //             setAssignments([]);
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };
    //     fetchAssignments();
    // }, [currentSemesterId]);

    useEffect(() => {
        if (!currentSemesterId) return;
        const fetchAssignments = async () => {
            setIsLoading(true);
            try {
                // Backend vẫn lọc theo hocky_id như cũ
                const res = await phanCongService.getAll({ hocky_id: currentSemesterId });
                setAssignments(res.data || []);
            } catch (err) {
                console.error("Lỗi load dữ liệu phân công", err);
                setAssignments([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAssignments();
    }, [currentSemesterId]);

    // --- 4. LOGIC LỌC THEO TUẦN VÀ TÌM KIẾM ---
    // const filteredAssignments = useMemo(() => {
    //     if (!currentSemesterId || weeks.length === 0) return [];
    //     const currentWeekData = weeks.find(w => w.id === selectedWeek);
    //     if (!currentWeekData) return [];

    //     return assignments.filter(item => {
    //         const itemDate = new Date(item.ngay);
    //         const isInSelectedWeek = itemDate >= currentWeekData.startDate && itemDate <= currentWeekData.endDate;
    //         if (!isInSelectedWeek) return false;

    //         const searchStr = searchTerm.toLowerCase();
    //         return (
    //             item.ten_mon?.toLowerCase().includes(searchStr) ||
    //             item.ten_giang_vien?.toLowerCase().includes(searchStr) ||
    //             item.phong?.toLowerCase().includes(searchStr) ||
    //             item.ma_mon?.toLowerCase().includes(searchStr) ||
    //             item.cac_lop_hanh_chinh?.toLowerCase().includes(searchStr)
    //         );
    //     });
    // }, [assignments, selectedWeek, weeks, searchTerm, currentSemesterId]);

    const filteredAssignments = useMemo(() => {
    if (!currentSemesterId || weeks.length === 0) return [];
    
    const currentWeekData = weeks.find(w => w.id === selectedWeek);
    if (!currentWeekData) return [];

    return assignments.filter(item => {
        // Tách ngày YYYY-MM-DD từ DB để tránh lỗi múi giờ
        const [y, m, d] = item.ngay.split('-').map(Number);
        const itemDate = new Date(y, m - 1, d);

        // So sánh nằm trong khoảng thời gian của tuần đã chọn
        const isInSelectedWeek = itemDate >= currentWeekData.startDate && itemDate <= currentWeekData.endDate;
        
        if (!isInSelectedWeek) return false;

        const searchStr = searchTerm.toLowerCase();
        const itemBoMonId = item.bo_mon_id || item.chuyennganh_id || null;
        const matchesBoMon = selectedBoMon === 'all' || itemBoMonId === selectedBoMon;

        if (!matchesBoMon) return false;

        return (
            item.ten_mon?.toLowerCase().includes(searchStr) ||
            item.ten_giang_vien?.toLowerCase().includes(searchStr) ||
            item.phong?.toLowerCase().includes(searchStr) ||
            item.ma_mon?.toLowerCase().includes(searchStr) ||
            item.cac_lop_hanh_chinh?.toLowerCase().includes(searchStr)
        );
    });
}, [assignments, selectedWeek, weeks, searchTerm, currentSemesterId, selectedBoMon]);

    // --- 5. CÁC HANDLERS (Giữ nguyên toàn bộ logic cũ) ---
    const handleAddNew = () => { setCurrentAssignment(null); setIsFormModalOpen(true); };
    const handleEdit = (item) => { setCurrentAssignment(item); setIsFormModalOpen(true); };
    const handleDeleteClick = (item) => { setCurrentAssignment(item); setIsDeleteModalOpen(true); };

    const handleSave = async (formData) => {
        setIsLoading(true);
        try {
            const res = currentAssignment?.buoi_id
                ? await phanCongService.update(currentAssignment.buoi_id, formData)
                : await phanCongService.create(formData);
            if (res.success) {
                const updatedList = await phanCongService.getAll({ hocky_id: currentSemesterId });
                setAssignments(updatedList.data || []);
                setIsFormModalOpen(false);
                return;
            }
            alert(res.message || (currentAssignment?.buoi_id ? 'Không thể cập nhật lịch dạy.' : 'Không thể tạo lịch dạy.'));
        } catch (error) {
            alert(error?.response?.data?.message || (currentAssignment?.buoi_id ? 'Lỗi cập nhật phân công' : 'Lỗi lưu phân công'));
        } 
        finally { setIsLoading(false); }
    };

    const handleConfirmDelete = async () => {
        if (!currentAssignment) return;
        try {
            const res = await phanCongService.delete(currentAssignment.buoi_id);
            setAssignments(prev => prev.filter(a => a.buoi_id !== currentAssignment.buoi_id));
            if (!res?.success) {
                alert(res?.message || 'Xóa buổi học chưa thành công hoàn toàn.');
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Xóa buổi học thất bại.');
        } finally {
            setIsDeleteModalOpen(false);
            setCurrentAssignment(null);
        }
    };

    const handleImportFile = async (data) => {
        setImportLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('ten_hocky', data.ten_hocky);
            formData.append('ngay_batdau', data.ngay_batdau); // QUAN TRỌNG: Sửa lỗi thiếu ngay_batdau
            formData.append('ngay_ketthuc', data.ngay_ketthuc);
            formData.append('ngay_monday_tuan_1', data.ngay_monday_tuan_1);
            formData.append('hocky_id', data.semesterId); // Gửi ID để backend dễ xử lý mapping nếu cần
            if (data.bomon_id) {
                formData.append('bomon_id', data.bomon_id);
            }

            const res = await phanCongService.importExcel(formData);
            if (res.data?.success || res.success) {
                setIsImportModalOpen(false);
                const importResult = res?.data?.importResult || res?.importResult || null;
                const successRows = Array.isArray(importResult?.successRows) ? importResult.successRows : [];
                const failedRows = Array.isArray(importResult?.failedRows) ? importResult.failedRows : [];

                setImportResultSummary({
                    totalRows: importResult?.totalRows ?? (successRows.length + failedRows.length),
                    successCount: importResult?.successCount ?? successRows.length,
                    failedCount: importResult?.failedCount ?? failedRows.length
                });
                setImportSuccessRows(successRows);
                setImportFailedRows(failedRows);
                setIsImportResultModalOpen(true);

                const updatedList = await phanCongService.getAll({ hocky_id: data.semesterId });
                setAssignments(updatedList.data || []);
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || 'Lỗi Import';
            setImportResultSummary({
                totalRows: 0,
                successCount: 0,
                failedCount: 1
            });
            setImportSuccessRows([]);
            setImportFailedRows([
                {
                    rowNumber: '-',
                    label: 'Import file Excel',
                    reason: errorMsg
                }
            ]);
            setIsImportResultModalOpen(true);
        } 
        finally { setImportLoading(false); }
    };

    const handleViewAttendanceProcess = async (item) => {
        if (!canViewAttendanceProcess) return;
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
                        tiet_hien_thi: item.tiet_hien_thi,
                        phong: item.phong,
                    },
                });
                setIsAttendanceModalOpen(true);
            } else {
                alert(res?.message || 'Không thể tải chi tiết điểm danh.');
            }
        } catch (error) {
            alert(error?.response?.data?.message || 'Không thể tải chi tiết điểm danh.');
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const handleCloseAttendanceModal = () => {
        setIsAttendanceModalOpen(false);
        setAttendanceDetail(null);
    };

    useEffect(() => {
        if (!isAttendanceModalOpen || typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isAttendanceModalOpen]);

    const lopHanhChinhText = Array.isArray(attendanceDetail?.lop_hanh_chinh)
        ? attendanceDetail.lop_hanh_chinh.join(', ')
        : 'Chưa có dữ liệu';
    const danhSachSinhVien = Array.isArray(attendanceDetail?.danh_sach_sinh_vien)
        ? attendanceDetail.danh_sach_sinh_vien
        : [];
    const lichSuCot = Array.isArray(danhSachSinhVien[0]?.history)
        ? danhSachSinhVien[0].history
        : [];
    const soSinhVienCanhBao = danhSachSinhVien.filter((sv) => sv.canh_bao).length;
    const isGlobalBusy = isLoading || importLoading || isAttendanceLoading;

    return (
        <div className="animate-in fade-in duration-500 text-slate-900">
            {/* Loading Overlay */}
            {isGlobalBusy && typeof document !== 'undefined' && createPortal((
                <div className="fixed inset-0 z-10000 bg-black/25 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-4">
                        <Loader2 className="animate-spin text-[#3B5998]" size={24} />
                        <span className="text-sm font-semibold">Đang xử lý dữ liệu...</span>
                    </div>
                </div>
            ), document.body)}

            {/* 
                LOGIC CHUYỂN ĐỔI COMPONENT:
                Nếu showProposals = true -> Hiện ProposalView
                Nếu showProposals = false -> Hiện Bảng lịch giảng dạy
            */}
            {showProposals ? (
                <ProposalView onBack={() => setShowProposals(false)} />
            ) : (
                <div className="animate-in fade-in duration-500">
                        {/* Header của Assignment */}
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Lịch trình giảng dạy</h1>
                                <p className="text-gray-500 mt-1 text-sm font-medium">Theo dõi và quản lý lịch học chi tiết từng ngày trong tuần.</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <SemesterSelector 
                                    semesters={semesters}
                                    currentSemesterId={currentSemesterId}
                                    onChange={setCurrentSemesterId}
                                />
                                <WeekSelector 
                                    weeks={weeks}
                                    selectedWeekId={selectedWeek}
                                    onChange={setSelectedWeek}
                                    onPrev={handleWeekPrev}
                                    onNext={handleWeekNext}
                                    canGoPrev={canGoPrevWeek}
                                    canGoNext={canGoNextWeek}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
                            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3 justify-between">
                                    <div className="relative w-full sm:w-80 group">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-[#3B5998]" />
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white transition-all outline-none"
                                            placeholder="Tìm môn, giảng viên..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        value={selectedBoMon}
                                        onChange={(e) => setSelectedBoMon(e.target.value)}
                                        className="w-full sm:w-60 px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 outline-none"
                                    >
                                        <option value="all">Tất cả Bộ môn</option>
                                        {boMonOptions.map((bm) => (
                                            <option key={bm.id} value={bm.id}>{bm.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {user?.vaitro !== 'truongbomon' && (
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <button 
                                            onClick={() => setShowProposals(true)}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <ClipboardCheck size={18} /> Xét duyệt đề xuất
                                        </button>

                                        <button 
                                            onClick={() => setIsImportModalOpen(true)} 
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Upload size={18} /> Import Excel
                                        </button>
                                        
                                        <button 
                                            onClick={handleAddNew} 
                                            className="flex-1 sm:flex-none px-5 py-2.5 bg-[#3B5998] hover:bg-[#2e4676] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Plus size={20} /> Thêm lịch dạy
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto">
                                <AssignmentTable 
                                    assignments={filteredAssignments}
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteClick}
                                    onViewAttendance={handleViewAttendanceProcess}
                                    canViewAttendance={canViewAttendanceProcess}
                                />
                            </div>

                            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
                                <span className="text-sm text-gray-600 font-semibold italic">
                                    * Hiển thị {filteredAssignments.length} buổi học trong tuần đã chọn
                                </span>
                            </div>
                        </div>
                </div>
            )}

            {/* Các Modal (đặt ở ngoài để dùng chung hoặc riêng cho view Assignment) */}
            {!showProposals && (
                <>
                    <AssignmentModal 
                        isOpen={isFormModalOpen} 
                        onClose={() => setIsFormModalOpen(false)} 
                        onSave={handleSave} 
                        initialData={currentAssignment} 
                    />
                    <DeleteConfirmModalSchedule 
                        isOpen={isDeleteModalOpen} 
                        onClose={() => setIsDeleteModalOpen(false)} 
                        onConfirm={handleConfirmDelete} 
                        subjectName={currentAssignment?.ten_mon} 
                    />
                    <ImportScheduleModal 
                        isOpen={isImportModalOpen} 
                        onClose={() => setIsImportModalOpen(false)} 
                        onImport={handleImportFile} 
                        isLoading={importLoading} 
                    />

                    <ImportResultModal
                        isOpen={isImportResultModalOpen}
                        onClose={() => setIsImportResultModalOpen(false)}
                        title="Kết quả import lịch trình"
                        summary={importResultSummary}
                        successRows={importSuccessRows}
                        failedRows={importFailedRows}
                    />

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
                                        <p className="font-semibold text-slate-700 truncate" title={lopHanhChinhText}>{lopHanhChinhText}</p>
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
                                            <AlertTriangle size={14} /> {soSinhVienCanhBao} sinh viên
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <table className="min-w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-5 py-3 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[220px] font-bold text-slate-600">Sinh viên</th>
                                                <th className="px-4 py-3 text-center border-r border-slate-200 min-w-[100px] font-bold text-slate-600">% Vắng</th>
                                                {lichSuCot.map((h, i) => (
                                                    <th key={i} className="px-3 py-3 text-center text-[10px] font-mono border-r border-slate-200 min-w-[90px] text-slate-500 uppercase">
                                                        {new Date(h.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {danhSachSinhVien.map((sv) => (
                                                <tr key={sv.sinhvien_id} className={sv.canh_bao ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                                                    <td className={`px-5 py-3 sticky left-0 z-10 border-r border-slate-200 ${sv.canh_bao ? 'bg-red-50 text-red-900' : 'bg-white text-slate-700'}`}>
                                                        <div className="font-semibold">{sv.ten_sv}</div>
                                                        <div className="text-[11px] opacity-70 font-mono">{sv.ma_sv}</div>
                                                        {sv.canh_bao && <div className="text-[10px] font-bold text-red-600 mt-1">Cảnh báo: Vắng quá 20%</div>}
                                                    </td>
                                                    <td className={`px-4 py-3 text-center font-black border-r border-slate-200 ${sv.canh_bao ? 'text-red-600' : 'text-slate-600'}`}>
                                                        {sv.ti_le_vang}%
                                                    </td>
                                                    {sv.history?.map((h, i) => (
                                                        <td key={i} className="px-3 py-3 text-center border-r border-slate-200 last:border-r-0">
                                                            {h.trangthai === 'present' && <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 mx-auto" />}
                                                            {h.trangthai === 'absent' && <div className="w-3.5 h-3.5 rounded-full bg-red-500 mx-auto" />}
                                                            {h.trangthai === 'late' && <div className="w-3.5 h-3.5 rounded-full bg-amber-500 mx-auto" />}
                                                            {h.trangthai === 'not_recorded' && <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mx-auto" />}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {danhSachSinhVien.length === 0 && (
                                                <tr>
                                                    <td colSpan={2 + lichSuCot.length} className="px-5 py-10 text-center text-slate-500">
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
                </>
            )}
        </div>
    );
}