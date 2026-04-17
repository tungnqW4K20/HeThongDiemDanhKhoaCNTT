import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, X, Trash2, Building2, RefreshCw, Upload, KeyRound, UserPlus } from 'lucide-react'; 
import LecturerTable from '../../components/lectures/LecturerTable';
import LecturerStats from '../../components/lectures/LecturerStats';
import LecturerModal from '../../components/lectures/LecturerModal';
import DeleteConfirmModalLectures from '../../components/lectures/DeleteConfirmModal';
import ImportLecturerModal from '../../components/lectures/ImportLecturerModal'; 
import giangVienService from '../../service/giangVienService';
import khoaService from '../../service/khoaService';
import authService from '../../service/authService';

export default function LecturerManagerPage() {
    // --- STATE ---
    const [lecturers, setLecturers] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('all'); 
    const [selectedBoMon, setSelectedBoMon] = useState('all');
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

    // --- EFFECT ---
    useEffect(() => {
        fetchData();
        fetchFaculties();
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

    // --- FILTER LOGIC ---
    const boMonOptions = useMemo(() => {
        return faculties.flatMap((khoa) =>
            (khoa.DanhSachChuyenNganh || []).map((bm) => ({
                id: bm.chuyennganh_id,
                name: bm.ten_chuyennganh
            }))
        );
    }, [faculties]);

    const filteredLecturers = useMemo(() => {
        return lecturers.filter(gv => {
            const searchLower = searchTerm.toLowerCase();
            const khoaName = gv.Khoa ? gv.Khoa.ten_khoa : '';
            const boMonName =
                gv.BoMon?.ten_bomon ||
                gv.ChuyenNganh?.ten_chuyen_nganh ||
                gv.bomon?.ten_bomon ||
                gv.ten_bomon ||
                '';

            const matchesSearch = 
                (gv.ten && gv.ten.toLowerCase().includes(searchLower)) || 
                (gv.ho && gv.ho.toLowerCase().includes(searchLower)) ||
                (gv.ma_gv && gv.ma_gv.toLowerCase().includes(searchLower)) ||
                (gv.email && gv.email.toLowerCase().includes(searchLower)) ||
                (khoaName && khoaName.toLowerCase().includes(searchLower));

            const matchesFaculty = selectedFaculty === 'all' || khoaName === selectedFaculty;
            const matchesBoMon = selectedBoMon === 'all' || boMonName === selectedBoMon;

            return matchesSearch && matchesFaculty && matchesBoMon;
        });
    }, [lecturers, searchTerm, selectedFaculty, selectedBoMon]);

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

                <LecturerStats totalLecturers={lecturers.length} />

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-8">
                    
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

                                <div className="relative flex-1 sm:w-56">
                                    <select
                                        value={selectedBoMon}
                                        onChange={(e) => setSelectedBoMon(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/10 focus:border-[#3B5998] text-sm appearance-none cursor-pointer hover:border-slate-300 transition-all"
                                    >
                                        <option value="all">Tất cả Bộ môn</option>
                                        {boMonOptions.map((bm) => <option key={bm.id} value={bm.name}>{bm.name}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <Filter size={14} className="text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Actions */}
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end border-t xl:border-none pt-4 xl:pt-0">
                            {selectedIds.length > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all animate-in slide-in-from-right-2"
                                >
                                    <Trash2 size={16} /> <span>Xóa {selectedIds.length} mục</span>
                                </button>
                            )}

                            <button 
                                onClick={fetchData} 
                                className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                title="Làm mới dữ liệu"
                            >
                                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="flex-1 min-h-[500px]">
                        <LecturerTable 
                            lecturers={filteredLecturers}
                            isLoading={isLoading}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onCreateAccount={handleOpenCreateAccount}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                        />
                    </div>

                    {/* FOOTER */}
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-medium">
                            Đang hiển thị <span className="text-slate-900 font-bold">{filteredLecturers.length}</span> giảng viên
                        </p>
                    </div>
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

            {/* MODAL TẠO TÀI KHOẢN */}
            {isCreateAccountModalOpen && accountTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !accountLoading && setIsCreateAccountModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                                <KeyRound size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {accountTarget.TaiKhoan?.taikhoan_id ? 'Cập nhật tài khoản' : 'Cấp tài khoản mới'}
                                </h3>
                                <p className="text-sm text-slate-500 italic">GV: {accountTarget.ho} {accountTarget.ten}</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateAccount} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Tên đăng nhập</label>
                                <input
                                    type="text"
                                    required
                                    value={accountForm.username}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">
                                    {accountTarget.TaiKhoan?.taikhoan_id ? 'Mật khẩu mới (Tùy chọn)' : 'Mật khẩu khởi tạo'}
                                </label>
                                <input
                                    type="password"
                                    required={!accountTarget.TaiKhoan?.taikhoan_id}
                                    minLength={6}
                                    value={accountForm.password}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all bg-slate-50"
                                    placeholder="Tối thiểu 6 ký tự..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    disabled={accountLoading}
                                    onClick={() => setIsCreateAccountModalOpen(false)}
                                    className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={accountLoading}
                                    className="flex-[2] py-3 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {accountLoading ? <RefreshCw size={18} className="animate-spin" /> : <KeyRound size={18} />}
                                    {accountTarget.TaiKhoan?.taikhoan_id ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}