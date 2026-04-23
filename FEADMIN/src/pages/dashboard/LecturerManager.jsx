import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, X, Trash2, Building2, RefreshCw, Upload, KeyRound } from 'lucide-react'; // Đã thêm icon Upload
import LecturerTable from '../../components/lectures/LecturerTable';
import LecturerStats from '../../components/lectures/LecturerStats';
import LecturerModal from '../../components/lectures/LecturerModal';
import DeleteConfirmModalLectures from '../../components/lectures/DeleteConfirmModal';
import ImportLecturerModal from '../../components/lectures/ImportLecturerModal'; 
import giangVienService from '../../service/giangVienService';
import khoaService from '../../service/khoaService';
import authService from '../../service/authService';
import { useAuth } from '../../hooks/useAuth';

export default function LecturerManagerPage() {
    const { user } = useAuth();
    const canManageLecturer = user?.vaitro !== 'truongbomon';
    // --- STATE ---
    const [lecturers, setLecturers] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('all'); 
    const [selectedBoMon, setSelectedBoMon] = useState('all');
    const [boMonOptions, setBoMonOptions] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
    const [importLoading, setImportLoading] = useState(false); 
    
    const [currentLecturer, setCurrentLecturer] = useState(null);

    // State tạo tài khoản giảng viên
    const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
    const [accountTarget, setAccountTarget] = useState(null);
    const [accountForm, setAccountForm] = useState({ username: '', password: '' });
    const [accountLoading, setAccountLoading] = useState(false);

    useEffect(() => {
        if (!isCreateAccountModalOpen || typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isCreateAccountModalOpen]);

    // --- EFFECT ---
    useEffect(() => {
        fetchData();
        fetchFaculties();
        fetchBoMonOptions();
    }, []);

    // --- API CALLS ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await giangVienService.getAll();
            const resData = response.data || response;
            
            if (Array.isArray(resData)) {
                setLecturers(resData);
            } else if (resData && Array.isArray(resData.data)) {
                setLecturers(resData.data);
            } else {
                setLecturers([]);
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách giảng viên:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFaculties = async () => {
        try {
            const res = await khoaService.getAll();
            const resData = res.data || res;
            if (Array.isArray(resData)) {
                setFaculties(resData);
            } else if (resData && Array.isArray(resData.data)) {
                setFaculties(resData.data.filter(Boolean));
            } else {
                setFaculties([]);
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách khoa:", error);
            setFaculties([]);
        }
    };

    const fetchBoMonOptions = async () => {
        try {
            const res = await khoaService.getAllBoMonRaw();
            const resData = res.data || res;
            const list = Array.isArray(resData)
                ? resData
                : (Array.isArray(resData?.data) ? resData.data : []);

            setBoMonOptions(
                list
                    .filter((bm) => bm?.bomon_id && (bm?.ten_bomon || bm?.ma_bomon))
                    .map((bm) => ({ id: bm.bomon_id, name: bm.ten_bomon || bm.ma_bomon }))
            );
        } catch (error) {
            console.error('Lỗi lấy danh sách bộ môn:', error);
            setBoMonOptions([]);
        }
    };

    // --- FILTER LOGIC ---
    const filteredLecturers = useMemo(() => {
        return lecturers.filter(gv => {
            const searchLower = searchTerm.toLowerCase();
            const khoaName = gv.Khoa ? gv.Khoa.ten_khoa : '';
            const boMonId =
                gv.bomon_id ||
                gv.BoMon?.bomon_id ||
                gv.ChuyenNganh?.chuyennganh_id ||
                gv.bomon?.bomon_id ||
                gv.chuyennganh_id ||
                null;

            const matchesSearch = 
                (gv.ten && gv.ten.toLowerCase().includes(searchLower)) || 
                (gv.ho && gv.ho.toLowerCase().includes(searchLower)) ||
                (gv.ma_gv && gv.ma_gv.toLowerCase().includes(searchLower)) ||
                (gv.email && gv.email.toLowerCase().includes(searchLower)) ||
                (khoaName && khoaName.toLowerCase().includes(searchLower));

            const matchesFaculty = selectedFaculty === 'all' || khoaName === selectedFaculty;
            const matchesBoMon = selectedBoMon === 'all' || boMonId === selectedBoMon;

            return matchesSearch && matchesFaculty && matchesBoMon;
        });
    }, [lecturers, searchTerm, selectedFaculty, selectedBoMon]);

    const stats = useMemo(() => {
        const total = lecturers.length;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const newThisMonth = lecturers.filter((gv) => {
            if (!gv?.ngay_tao) return false;
            const created = new Date(gv.ngay_tao);
            if (Number.isNaN(created.getTime())) return false;
            return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
        }).length;

        const emailActivatedCount = lecturers.filter((gv) => {
            const email = (gv?.email || '').trim();
            return email.length > 0 && email.includes('@');
        }).length;

        const emailActivatedPercent = total > 0
            ? Math.round((emailActivatedCount / total) * 100)
            : 0;

        return {
            total,
            newThisMonth,
            emailActivatedPercent
        };
    }, [lecturers]);

    // --- HANDLERS ---
    const handleAddNew = () => {
        setCurrentLecturer(null);
        setIsFormModalOpen(true);
    };

    const handleEdit = (lecturer) => {
        setCurrentLecturer(lecturer);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (lecturer) => {
        setCurrentLecturer(lecturer);
        setIsDeleteModalOpen(true);
    };

    const handleOpenCreateAccount = (lecturer) => {
        setAccountTarget(lecturer);
        const hasAccount = !!lecturer.TaiKhoan?.taikhoan_id;
        setAccountForm({
            username: hasAccount ? lecturer.TaiKhoan.username : (lecturer.ma_gv || ''),
            password: ''
        });
        setIsCreateAccountModalOpen(true);
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!accountTarget) return;
        setAccountLoading(true);
        const hasAccount = !!accountTarget.TaiKhoan?.taikhoan_id;
        try {
            let res;
            if (hasAccount) {
                res = await authService.updateLecturerAccount(accountTarget.TaiKhoan.taikhoan_id, {
                    username: accountForm.username,
                    new_password: accountForm.password || undefined
                });
            } else {
                res = await authService.createLecturerAccount({
                    username: accountForm.username,
                    password: accountForm.password,
                    ma_gv: accountTarget.ma_gv
                });
            }
            if (res.success || res.errCode === 0) {
                alert(hasAccount ? '✅ Cập nhật tài khoản thành công' : '✅ Tạo tài khoản thành công');
                setIsCreateAccountModalOpen(false);
                fetchData();
            } else {
                alert('⚠️ ' + (res.message || 'Thất bại'));
            }
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
        } finally {
            setAccountLoading(false);
        }
    };

    const handleSave = async (formData) => {
        try {
            const res = currentLecturer 
                ? await giangVienService.update(currentLecturer.giangvien_id, formData)
                : await giangVienService.create(formData);
            
            if (res.success || res.errCode === 0) { 
                alert(currentLecturer ? "Cập nhật thành công!" : "Thêm mới thành công!"); 
                fetchData(); 
                setIsFormModalOpen(false);
            } else {
                alert(res.message || "Lỗi thao tác");
            }
        } catch (error) {
            alert("Có lỗi xảy ra: " + (error.response?.data?.message || error.message));
        }
    };

    const handleConfirmDelete = async () => {
        if (currentLecturer) {
            try {
                const res = await giangVienService.delete(currentLecturer.giangvien_id);
                if (res.success || res.errCode === 0) {
                    fetchData();
                    setSelectedIds(prev => prev.filter(id => id !== currentLecturer.giangvien_id));
                } else {
                    alert(res.message || "Xóa thất bại");
                }
            } catch (error) {
                alert("Không thể xóa giảng viên này.");
            } finally {
                setIsDeleteModalOpen(false);
                setCurrentLecturer(null);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} giảng viên đã chọn?`)) {
            try {
                await Promise.all(selectedIds.map(id => giangVienService.delete(id)));
                fetchData(); 
                setSelectedIds([]);
            } catch (error) {
                alert("Có lỗi xảy ra khi xóa danh sách.");
            }
        }
    };

    const handleImportFile = async (file) => {
        if (!file) return;
        setImportLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const result = await giangVienService.importExcel(formData);
            if (result && (result.success === true || result.errCode === 0)) {
                await fetchData(); 
                const stats = result.data;
                let detailMsg = stats ? `\n- Tổng: ${stats.total_rows}\n- Thêm mới: ${stats.inserted}\n- Bỏ qua: ${stats.duplicates_skipped}` : "";
                alert(`✅ ${result.message || "Import thành công"}${detailMsg}`);
                setIsImportModalOpen(false);
            } else {
                alert(`⚠️ Thông báo: ${result.message || "Lỗi định dạng"}`);
            }
        } catch (error) {
            alert(`❌ Lỗi hệ thống: ${error.response?.data?.message || error.message}`);
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-[1440px] mx-auto">
                
                {/* HEADER SECTION - NEW LAYOUT */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {/* <div className="p-2 bg-[#3B5998] rounded-lg text-white">
                                <Building2 size={24} />
                            </div> */}
                            <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998] tracking-tight">Quản lý Giảng viên</h1>
                        </div>
                        <p className="text-slate-500 text-sm md:text-base">Hệ thống quản lý hồ sơ, chuyên môn và tài khoản giảng viên toàn trường.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex-1 sm:flex-none px-5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Upload size={18} className="text-blue-600" /> 
                            <span>Import Excel</span>
                        </button>
                        
                        <button 
                            onClick={handleAddNew}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-[#3B5998] hover:bg-[#2e4676] text-white font-bold rounded-xl shadow-md shadow-blue-900/10 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} strokeWidth={3} /> 
                            <span>Thêm Giảng viên mới</span>
                        </button>
                    </div>
                </div>

                <LecturerStats
                    totalLecturers={stats.total}
                    newThisMonth={stats.newThisMonth}
                    emailActivatedPercent={stats.emailActivatedPercent}
                />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
                    
                    {/* TOOLBAR */}
                    <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white">
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                            {/* Search */}
                            <div className="relative w-full sm:w-80 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#3B5998]" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] text-sm transition-all"
                                    placeholder="Tìm tên, mã GV, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Filter Faculty */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-56">
                                    <select
                                        value={selectedFaculty}
                                        onChange={(e) => setSelectedFaculty(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] text-sm appearance-none cursor-pointer hover:border-slate-300 transition-all"
                                    >
                                        <option value="all">Tất cả Khoa / Viện</option>
                                        {faculties.map(khoa => <option key={khoa.khoa_id} value={khoa.ten_khoa}>{khoa.ten_khoa}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <Filter size={14} className="text-slate-400" />
                                    </div>
                                </div>
                                <select
                                    value={selectedBoMon}
                                    onChange={(e) => setSelectedBoMon(e.target.value)}
                                    className="block w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <option value="all">Tất cả Bộ môn</option>
                                    {boMonOptions.map((bm) => (
                                        <option key={bm.id} value={bm.name}>
                                            {bm.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Filter size={14} className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                            <button 
                                onClick={fetchData} 
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Làm mới"
                            >
                                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                            </button>

                            {/* 🔥 NÚT IMPORT EXCEL */}
                            {canManageLecturer && (
                                <button 
                                    onClick={() => setIsImportModalOpen(true)}
                                className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                            >
                                <Upload size={16} /> <span className="hidden sm:inline">Import Excel</span>
                            </button>
                            )}

                            {canManageLecturer && selectedIds.length > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all animate-in slide-in-from-right-2"
                                >
                                    <Trash2 size={16} /> <span>Xóa {selectedIds.length} mục</span>
                                </button>
                            )}
                            
                            {canManageLecturer && (
                                <button 
                                    onClick={handleAddNew}
                                className="px-4 py-2 bg-[#3B5998] hover:bg-[#2e4676] text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                            </button>
                            )}
                        </div>
                    </div>

                    {/* TABLE */}
                    <LecturerTable 
                        lecturers={filteredLecturers}
                        isLoading={isLoading}
                        onEdit={canManageLecturer ? handleEdit : undefined}
                        onDelete={canManageLecturer ? handleDeleteClick : undefined}
                        onCreateAccount={canManageLecturer ? handleOpenCreateAccount : undefined}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        canManage={canManageLecturer}
                    />

                </div>
            </div>

            {/* MODALS */}
            <LecturerModal 
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSave={handleSave}
                initialData={currentLecturer}
                faculties={faculties}
            />

            <DeleteConfirmModalLectures
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                subjectName={currentLecturer ? `${currentLecturer.ho} ${currentLecturer.ten}` : ''}
            />

            <ImportLecturerModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportFile}
                isLoading={importLoading}
            />

            {/* 4. MODAL TẠO TÀI KHOẢN GIẢNG VIÊN */}
            {isCreateAccountModalOpen && accountTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => !accountLoading && setIsCreateAccountModalOpen(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                <KeyRound size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {accountTarget.TaiKhoan?.taikhoan_id ? 'Cập nhật tài khoản' : 'Cấp tài khoản mới'}
                                </h3>
                                <p className="text-sm text-slate-500 italic">GV: {accountTarget.ho} {accountTarget.ten}</p>
                            </div>
                        </div>

                        {(() => {
                            const hasAccount = !!accountTarget?.TaiKhoan?.taikhoan_id;
                            return (
                                <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tên đăng nhập</label>
                                        <input
                                            type="text"
                                            required
                                            value={accountForm.username}
                                            onChange={(e) => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50 focus:bg-white transition-all"
                                            placeholder="Nhập tên đăng nhập..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                            {hasAccount ? 'Mật khẩu mới' : 'Mật khẩu'}
                                            {hasAccount && <span className="ml-1 text-gray-400 font-normal">(để trống nếu không đổi)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            required={!hasAccount}
                                            minLength={hasAccount ? 0 : 6}
                                            value={accountForm.password}
                                            onChange={(e) => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50 focus:bg-white transition-all"
                                            placeholder={hasAccount ? 'Nhập mật khẩu mới (tùy chọn)...' : 'Tối thiểu 6 ký tự...'}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            disabled={accountLoading}
                                            onClick={() => setIsCreateAccountModalOpen(false)}
                                            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={accountLoading}
                                            className="flex-[2] py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {accountLoading ? (
                                                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <KeyRound size={16} />
                                            )}
                                            {accountLoading
                                                ? (hasAccount ? 'Đang cập nhật...' : 'Đang tạo...')
                                                : (hasAccount ? 'Cập nhật tài khoản' : 'Tạo tài khoản')}
                                        </button>
                                    </div>
                                </form>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}