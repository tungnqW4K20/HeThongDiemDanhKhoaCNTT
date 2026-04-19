'use strict';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    ArrowLeft, CheckCircle2, XCircle, Clock, 
    Search, Info, ChevronRight, Loader2, AlertCircle,
    Calendar, MapPin, User, BookOpen, MessageSquare,
    AlertTriangle, History, UserPlus, RefreshCw
} from 'lucide-react';
import deXuatService from '../../service/dexuatService';

const ProposalView = ({ onBack }) => {
    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // State cho Modal xác nhận nhỏ gọn, tinh tế
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        data: null, // Lưu object đề xuất để hiển thị context
        action: null, // 'approved' hoặc 'rejected'
        loading: false
    });

    // 1. Fetch dữ liệu từ API
    const fetchProposals = async () => {
        setIsLoading(true);
        try {
            const res = await deXuatService.getDanhSachCho();
            // Đảm bảo dữ liệu trả về là array
            setProposals(res.data || []);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách đề xuất:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    // 2. Logic lọc tìm kiếm và Tab trạng thái
    const filtered = useMemo(() => {
        return proposals.filter(p => {
            // Lọc theo Tab (all, pending, rejected)
            const matchStatus = statusFilter === 'all' || p.trang_thai === statusFilter;
            
            // Tìm kiếm theo tên Giảng viên hoặc Tên môn
            const giangVien = `${p.NguoiDeXuat?.ho || ''} ${p.NguoiDeXuat?.ten || ''}`.toLowerCase();
            const monHoc = p.BuoiHoc?.LopHocPhan?.MonHoc?.ten_mon?.toLowerCase() || "";
            const search = searchTerm.toLowerCase();
            
            return matchStatus && (giangVien.includes(search) || monHoc.includes(search));
        });
    }, [proposals, statusFilter, searchTerm]);

    // 3. Logic mở Modal xác nhận
    const openConfirmModal = (proposal, action) => {
        setConfirmModal({
            isOpen: true,
            data: proposal,
            action,
            loading: false
        });
    };

    const closeConfirmModal = () => {
        if (confirmModal.loading) return;
        setConfirmModal({ ...confirmModal, isOpen: false });
    };

    // 4. Xử lý hành động gọi API PUT
    const handleExecuteAction = async () => {
        const { data, action } = confirmModal;
        setConfirmModal(prev => ({ ...prev, loading: true }));

        try {
            // Gọi API theo format: PUT /api/de-xuat/phe-duyet/:id { "status": "..." }
            const response = await deXuatService.pheDuyetDeXuat(data.dexuat_id, action);
            
            if (response.success) {
                await fetchProposals(); // Load lại danh sách sau khi xử lý thành công
                setConfirmModal({ ...confirmModal, isOpen: false, loading: false });
            }
        } catch (error) {
            alert("Thao tác thất bại: " + (error.response?.data?.message || "Lỗi kết nối máy chủ"));
            setConfirmModal(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 relative">
            
            {/* --- COMPACT PROFESSIONAL MODAL --- */}
            {confirmModal.isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={closeConfirmModal}
                    ></div>
                    
                    <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] max-w-[360px] w-full overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto rotate-3 ${
                                confirmModal.action === 'approved' ? 'bg-blue-50 text-[#3B5998]' : 'bg-rose-50 text-rose-500'
                            }`}>
                                {confirmModal.action === 'approved' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
                            </div>
                            
                            <h3 className="text-lg font-black text-slate-800 text-center mb-1">
                                {confirmModal.action === 'approved' 
                                    ? (confirmModal.data?.loai_de_xuat === 'mo_lai' ? 'Xác nhận mở lại buổi học?' : 'Xác nhận phê duyệt?') 
                                    : 'Xác nhận từ chối?'}
                            </h3>
                            
                            <div className="bg-gray-50 rounded-2xl p-4 my-5 border border-gray-100 text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Giảng viên & Môn</p>
                                <p className="text-sm font-bold text-slate-700 truncate">
                                    {confirmModal.data?.NguoiDeXuat?.ho} {confirmModal.data?.NguoiDeXuat?.ten}
                                </p>
                                <p className="text-[11px] text-[#3B5998] font-bold truncate">
                                    {confirmModal.data?.BuoiHoc?.LopHocPhan?.MonHoc?.ten_mon}
                                </p>
                            </div>

                            <p className="text-[13px] text-slate-500 text-center leading-relaxed">
                                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
                            </p>
                        </div>

                        <div className="flex gap-2 p-4 bg-gray-50/50 border-t border-gray-50">
                            <button 
                                onClick={closeConfirmModal}
                                disabled={confirmModal.loading}
                                className="flex-[2] py-3 text-gray-500 font-bold text-xs hover:text-slate-800 transition-colors"
                            >
                                Quay lại
                            </button>
                            <button 
                                onClick={handleExecuteAction}
                                disabled={confirmModal.loading}
                                className={`flex-[3] py-3 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    confirmModal.action === 'approved' 
                                    ? 'bg-[#3B5998] hover:bg-[#2e4676] shadow-blue-200' 
                                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                } disabled:opacity-50`}
                            >
                                {confirmModal.loading ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    'Xác nhận ngay'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- HEADER --- */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={onBack} 
                        className="group p-3 bg-white border border-gray-200 rounded-2xl hover:border-[#3B5998] hover:bg-blue-50 text-gray-500 hover:text-[#3B5998] transition-all shadow-sm active:scale-90"
                    >
                        <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform"/>
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Xét duyệt đề xuất</h1>
                        <div className="flex items-center gap-2 mt-1 text-gray-500 font-medium italic">
                            <Clock size={14} />
                            <span className="text-sm">Quản lý và xử lý các yêu cầu thay đổi lịch học</span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl border border-gray-200 shadow-inner w-fit overflow-x-auto">
                    {[
                        { id: 'all', label: 'TẤT CẢ', count: proposals.length },
                        { id: 'pending', label: 'CHỜ DUYỆT', count: proposals.filter(p => p.trang_thai === 'pending').length },
                        { id: 'rejected', label: 'ĐÃ TỪ CHỐI', count: proposals.filter(p => p.trang_thai === 'rejected').length }
                    ].map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => setStatusFilter(s.id)} 
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${
                                statusFilter === s.id 
                                ? 'bg-white text-[#3B5998] shadow-md transform scale-105' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {s.id === 'rejected' && <History size={14} />}
                            {s.label}
                            {s.count > 0 && (
                                <span className={`ml-1 px-2 py-0.5 rounded-md text-[10px] ${statusFilter === s.id ? 'bg-blue-100' : 'bg-gray-300 text-white'}`}>
                                    {s.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- MAIN TABLE --- */}
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-gray-100 overflow-hidden transition-all">
                <div className="p-6 border-b border-gray-50 bg-gray-50/40">
                    <div className="relative max-w-lg group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#3B5998]" size={20} />
                        <input 
                            type="text" 
                            placeholder="Tìm giảng viên hoặc tên môn học..." 
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm"
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-5">
                            <Loader2 className="animate-spin text-[#3B5998]" size={48} />
                            <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang đồng bộ dữ liệu...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                            <AlertCircle size={60} className="opacity-20 mb-4" />
                            <p className="font-bold text-lg text-slate-400">Không tìm thấy đề xuất</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/30 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5 text-left">Giảng viên / Môn</th>
                                    <th className="px-8 py-5 text-left">Nội dung điều chỉnh</th>
                                    <th className="px-8 py-5 text-left">Lý do thay đổi</th>
                                    <th className="px-8 py-5 text-center">Trạng thái / Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((p, index) => (
                                    <tr 
                                        key={p.dexuat_id} 
                                        className="group hover:bg-[#3B5998]/[0.01] transition-all duration-300"
                                    >
                                        <td className="px-8 py-8">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-blue-50 text-[#3B5998] rounded-xl group-hover:bg-[#3B5998] group-hover:text-white transition-all">
                                                    {p.loai_de_xuat === 'mo_lai' ? <RefreshCw size={20} /> : <User size={20} />}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 text-base leading-tight">
                                                        {p.NguoiDeXuat?.ho} {p.NguoiDeXuat?.ten}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <BookOpen size={12} className="text-[#3B5998]"/>
                                                        <span className="text-[11px] text-[#3B5998] font-black uppercase">
                                                            {p.BuoiHoc?.LopHocPhan?.MonHoc?.ten_mon}
                                                        </span>
                                                    </div>
                                                    {p.loai_de_xuat === 'mo_lai' && (
                                                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-wide rounded-full">
                                                            <RefreshCw size={9} /> Mở lại buổi học
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-8 py-8">
                                            {p.loai_de_xuat === 'mo_lai' ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-xl min-w-[120px]">
                                                        <span className="block text-[8px] font-black text-orange-400 uppercase mb-0.5">Buổi học</span>
                                                        <div className="text-[11px] font-bold text-gray-700">{p.BuoiHoc?.ngay}</div>
                                                        <div className="text-[9px] text-gray-500">P.{p.BuoiHoc?.phong || p.BuoiHoc?.LopHocPhan?.phong} — Tiết {p.BuoiHoc?.tiet_bat_dau}</div>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <RefreshCw size={14} className="text-orange-400" />
                                                    </div>
                                                    <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl min-w-[120px]">
                                                        <span className="block text-[8px] font-black text-green-600 uppercase mb-0.5">Yêu cầu</span>
                                                        <div className="text-[11px] font-black text-green-700">Mở lại buổi học</div>
                                                        <div className="text-[9px] text-green-500">Khôi phục lịch đã hủy</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 min-w-[120px] p-2.5 bg-gray-50 border border-gray-100 rounded-xl opacity-60">
                                                        <span className="block text-[8px] font-black text-gray-400 uppercase">Lịch cũ</span>
                                                        <div className="text-[11px] font-bold text-gray-600">{p.BuoiHoc?.ngay}</div>
                                                        <div className="text-[9px] text-gray-500">P.{p.BuoiHoc?.phong || p.BuoiHoc?.LopHocPhan?.phong}</div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-center gap-1">
                                                        <ChevronRight size={16} className="text-gray-300" />
                                                    </div>

                                                    <div className="flex-1 min-w-[150px] p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                                        <span className="block text-[8px] font-black text-[#3B5998] uppercase">Lịch mới & GV Dạy thay</span>
                                                        <div className="text-[11px] font-black text-blue-700">{p.ngay_moi}</div>
                                                        <div className="text-[9px] font-bold text-blue-500">P.{p.phong_moi} - Tiết {p.tiet_bat_dau_moi}</div>
                                                        
                                                        {/* HIỂN THỊ GIẢNG VIÊN DẠY THAY MỚI */}
                                                        {p.GVDayThayMoi && (
                                                            <div className="mt-2 pt-2 border-t border-blue-100 flex items-center gap-1.5">
                                                                <UserPlus size={10} className="text-blue-700" />
                                                                <span className="text-[10px] font-black text-blue-800 uppercase italic">
                                                                    {p.GVDayThayMoi.ho} {p.GVDayThayMoi.ten}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-8 py-8">
                                            <div className="flex items-start gap-3 max-w-[220px] p-3 bg-orange-50/30 border border-orange-100 rounded-2xl">
                                                <MessageSquare size={14} className="text-orange-400 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-2">
                                                    "{p.ly_do}"
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-8 py-8 text-center">
                                            {p.trang_thai === 'pending' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => openConfirmModal(p, 'rejected')} 
                                                        className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <XCircle size={22} />
                                                    </button>
                                                    <button 
                                                        onClick={() => openConfirmModal(p, 'approved')} 
                                                        className="p-3 bg-[#3B5998] text-white hover:bg-[#2e4676] rounded-xl shadow-md transition-all active:scale-95"
                                                    >
                                                        <CheckCircle2 size={22} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                        p.trang_thai === 'approved' 
                                                        ? 'bg-green-100 text-green-600' 
                                                        : 'bg-rose-100 text-rose-600'
                                                    }`}>
                                                        {p.trang_thai === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối'}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-medium italic mt-1">
                                                        {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-8 py-5 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Tổng số: {filtered.length} kết quả</span>
                    <span>Admin Control v1.0</span>
                </div>
            </div>
        </div>
    );
};

export default ProposalView;