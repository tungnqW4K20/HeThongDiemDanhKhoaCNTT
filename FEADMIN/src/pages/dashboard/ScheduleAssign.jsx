'use strict';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, Plus, Loader2, Upload, ClipboardCheck 
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';

// Components
import SemesterSelector from '../../components/assign/SemesterSelector';
import WeekSelector from '../../components/assign/WeekSelector'; 
import AssignmentTable from '../../components/assign/AssignmentTable';
import AssignmentModal from '../../components/assign/AssignmentModal';
import DeleteConfirmModalSchedule from '../../components/assign/DeleteConfirmModal';
import ImportScheduleModal from '../../components/assign/ImportScheduleModal'; 

// Services
import phanCongService from '../../service/phancongService';
import hocKyService from '../../service/hockyService'; 
import ProposalView from '../../components/assign/ProposalView.jsx';

// Utility functions (giữ nguyên logic cũ)
const formatDateVN = (date) => {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

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

    // --- STATE ĐIỀU HƯỚNG ---
    const [showProposals, setShowProposals] = useState(false);

    // --- STATE DỮ LIỆU ---
    const [currentSemesterId, setCurrentSemesterId] = useState('');
    const [semesters, setSemesters] = useState([]);
    const [assignments, setAssignments] = useState([]); 
    const [weeks, setWeeks] = useState([]); 
    const [selectedWeek, setSelectedWeek] = useState(1);

    // --- STATE UI & MODAL ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
    const [currentAssignment, setCurrentAssignment] = useState(null);

    // --- 1. FETCH DANH SÁCH HỌC KỲ ---
    useEffect(() => {
        const fetchHocKy = async () => {
            try {
                const res = await hocKyService.getAll();
                const listHocKy = res.data || []; 
                if (listHocKy.length > 0) {
                    setSemesters(listHocKy);
                    setCurrentSemesterId(listHocKy[0].hocky_id);
                }
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

        // Auto-chọn tuần hiện tại nếu đang trong học kỳ này
        const now = new Date();
        const currentWeek = weeksOfSem.find(w => now >= w.startDate && now <= w.endDate);
        setSelectedWeek(currentWeek ? currentWeek.id : (weeksOfSem[0]?.id ?? tuanBatDau));
    }, [currentSemesterId, semesters]);

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
        return (
            item.ten_mon?.toLowerCase().includes(searchStr) ||
            item.ten_giang_vien?.toLowerCase().includes(searchStr) ||
            item.phong?.toLowerCase().includes(searchStr) ||
            item.ma_mon?.toLowerCase().includes(searchStr) ||
            item.cac_lop_han_chinh?.toLowerCase().includes(searchStr)
        );
    });
}, [assignments, selectedWeek, weeks, searchTerm, currentSemesterId]);

    // --- 5. CÁC HANDLERS (Giữ nguyên toàn bộ logic cũ) ---
    const handleAddNew = () => { setCurrentAssignment(null); setIsFormModalOpen(true); };
    const handleEdit = (item) => { setCurrentAssignment(item); setIsFormModalOpen(true); };
    const handleDeleteClick = (item) => { setCurrentAssignment(item); setIsDeleteModalOpen(true); };

    const handleSave = async (formData) => {
        setIsLoading(true);
        try {
            const res = await phanCongService.create(formData);
            if (res.success) {
                const updatedList = await phanCongService.getAll({ hocky_id: currentSemesterId });
                setAssignments(updatedList.data || []);
                setIsFormModalOpen(false);
            }
        } catch (error) { alert("Lỗi lưu phân công"); } 
        finally { setIsLoading(false); }
    };

    const handleConfirmDelete = async () => {
        if (!currentAssignment) return;
        try {
            await phanCongService.delete(currentAssignment.buoi_id);
            setAssignments(prev => prev.filter(a => a.buoi_id !== currentAssignment.buoi_id));
        } finally {
            setIsDeleteModalOpen(false);
            setCurrentAssignment(null);
        }
    };

    const handleImportFile = async (data) => {
        const selectedSem = semesters.find(s => s.hocky_id === data.semesterId);
        setImportLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('ten_hocky', data.ten_hocky);
            formData.append('ngay_batdau', data.ngay_batdau); // QUAN TRỌNG: Sửa lỗi thiếu ngay_batdau
            formData.append('ngay_ketthuc', data.ngay_ketthuc);
            formData.append('ngay_monday_tuan_1', data.ngay_monday_tuan_1);
            formData.append('hocky_id', data.semesterId); // Gửi ID để backend dễ xử lý mapping nếu cần

            const res = await phanCongService.importExcel(formData);
            if (res.data?.success || res.success) {
                alert("Import thành công");
                setIsImportModalOpen(false);
                const updatedList = await phanCongService.getAll({ hocky_id: data.semesterId });
                setAssignments(updatedList.data || []);
            }
        } catch (error) { alert("Lỗi Import"); } 
        finally { setImportLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] p-6 md:p-8 font-sans text-slate-900">
            {/* Loading Overlay */}
            {(isLoading || importLoading) && (
                <div className="fixed inset-0 z-[60] bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-4">
                        <Loader2 className="animate-spin text-[#3B5998]" size={24} />
                        <span className="text-sm font-semibold">Đang xử lý dữ liệu...</span>
                    </div>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto">
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
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
                            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
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
                                    
                                    {/* <button 
                                        onClick={handleAddNew} 
                                        className="flex-1 sm:flex-none px-5 py-2.5 bg-[#3B5998] hover:bg-[#2e4676] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Plus size={20} /> Tạo buổi học
                                    </button> */}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <AssignmentTable 
                                    assignments={filteredAssignments}
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteClick}
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
            </div>

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
                </>
            )}
        </div>
    );
}