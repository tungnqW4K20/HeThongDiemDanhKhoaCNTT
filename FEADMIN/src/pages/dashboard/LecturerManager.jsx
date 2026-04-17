import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, X, Trash2, Building2, RefreshCw, Upload, KeyRound } from 'lucide-react'; // Đã thêm icon Upload
import LecturerTable from '../../components/lectures/LecturerTable';
import LecturerStats from '../../components/lectures/LecturerStats';
import LecturerModal from '../../components/lectures/LecturerModal';
import DeleteConfirmModalLectures from '../../components/lectures/DeleteConfirmModal';
import ImportLecturerModal from '../../components/lectures/ImportLecturerModal'; // Component Import Mới
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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); // State Modal Import
    const [importLoading, setImportLoading] = useState(false); // Loading state cho Import
    
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
            // Xử lý dữ liệu trả về linh hoạt
            // axiosClient của bạn đã bóc tách data, nên response chính là object { success: true, data: [] }
            // Hoặc đôi khi server trả mảng trực tiếp
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

    // --- HANDLERS (CRUD) ---
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
                // Cập nhật tài khoản hiện có
                res = await authService.updateLecturerAccount(accountTarget.TaiKhoan.taikhoan_id, {
                    username: accountForm.username,
                    new_password: accountForm.password || undefined
                });
            } else {
                // Tạo tài khoản mới
                res = await authService.createLecturerAccount({
                    username: accountForm.username,
                    password: accountForm.password,
                    ma_gv: accountTarget.ma_gv
                });
            }
            const resData = res;
            if (resData.success || resData.errCode === 0) {
                alert(hasAccount
                    ? `✅ Cập nhật tài khoản thành công cho GV ${accountTarget.ho} ${accountTarget.ten}`
                    : `✅ Tạo tài khoản thành công cho GV ${accountTarget.ho} ${accountTarget.ten}`);
                setIsCreateAccountModalOpen(false);
                fetchData();
            } else {
                alert('⚠️ ' + (resData.message || (hasAccount ? 'Cập nhật thất bại' : 'Tạo tài khoản thất bại')));
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            alert('❌ Lỗi: ' + msg);
        } finally {
            setAccountLoading(false);
        }
    };

    const handleSave = async (formData) => {
        try {
            if (currentLecturer) {
                const res = await giangVienService.update(currentLecturer.giangvien_id, formData);
                const resData = res;
                
                if (resData.success || resData.errCode === 0) { 
                    alert("Cập nhật thành công!"); 
                    fetchData(); 
                    setIsFormModalOpen(false);
                } else {
                    alert(resData.message || "Lỗi cập nhật");
                }
            } else {
                const res = await giangVienService.create(formData);
                const resData = res;
                
                if (resData.success || resData.errCode === 0) {
                    alert("Thêm mới thành công!");
                    fetchData(); 
                    setIsFormModalOpen(false);
                } else {
                    alert(resData.message || "Lỗi thêm mới");
                }
            }
        } catch (error) {
            console.error("Lỗi khi lưu giảng viên:", error);
            const msg = error.response?.data?.message || error.message;
            alert("Có lỗi xảy ra: " + msg);
        }
    };

    const handleConfirmDelete = async () => {
        if (currentLecturer) {
            try {
                const res = await giangVienService.delete(currentLecturer.giangvien_id);
                const resData = res;
                
                if (resData.success || resData.errCode === 0) {
                    fetchData();
                    setSelectedIds(prev => prev.filter(id => id !== currentLecturer.giangvien_id));
                } else {
                    alert(resData.message || "Xóa thất bại");
                }
            } catch (error) {
                console.error("Lỗi khi xóa:", error);
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
                const deletePromises = selectedIds.map(id => giangVienService.delete(id));
                await Promise.all(deletePromises);
                fetchData(); 
                setSelectedIds([]);
            } catch (error) {
                console.error("Lỗi khi xóa nhiều:", error);
                alert("Có lỗi xảy ra khi xóa danh sách.");
            }
        }
    };

    // 🔥 IMPORT HANDLER (TÍCH HỢP API)
    const handleImportFile = async (file) => {
    if (!file) return;
    setImportLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await giangVienService.importExcel(formData);
        
        // 1. Xác định đúng Object chứa field 'success'
        // Trong trường hợp của bạn, 'response' chính là cái JSON chứa {success, message, data}
        // Chúng ta KHÔNG lấy response.data ở đây vì nó sẽ lấy nhầm vào object thống kê
        const result = response; 

        console.log("Dữ liệu kiểm tra:", result);

        // 2. Kiểm tra điều kiện thành công (Dùng check linh hoạt hơn)
        if (result && (result.success === true || result.errCode === 0)) {
            
            // Load lại danh sách giảng viên trên màn hình
            await fetchData(); 
            
            // Lấy thông tin thống kê từ object data bên trong
            const stats = result.data; // Đây mới là {total_rows, inserted, ...}
            
            let detailMsg = "";
            if (stats) {
                detailMsg = `\n- Tổng số dòng: ${stats.total_rows}` +
                            `\n- Thêm mới: ${stats.inserted}` +
                            `\n- Bỏ qua (trùng): ${stats.duplicates_skipped}`;
            }

            alert(`✅ ${result.message || "Import thành công"}${detailMsg}`);
            setIsImportModalOpen(false);
            
        } else {
            // Nếu result.success là false hoặc không tồn tại
            const msg = result.message || "Dữ liệu không hợp lệ hoặc lỗi định dạng.";
            alert(`⚠️ Thông báo: ${msg}`);
        }
    } catch (error) {
        console.error("Lỗi Import:", error);
        // Lấy lỗi từ server trả về nếu có
        const serverError = error.response?.data?.message || error.message || "Lỗi kết nối server";
        alert(`❌ Lỗi hệ thống: ${serverError}`);
    } finally {
        setImportLoading(false);
    }
};

    return (
        <div className="animate-in fade-in duration-500 text-slate-900">
            <div className="mb-8">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý Giảng viên</h1>
                        <p className="text-gray-500 mt-1 text-sm">Quản lý hồ sơ giảng viên, thông tin liên hệ và tài khoản.</p>
                    </div>
                </div>

                <LecturerStats totalLecturers={lecturers.length} />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
                    
                    {/* TOOLBAR */}
                    <div className="p-5 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white">
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                            {/* Search */}
                            <div className="relative w-full sm:w-80 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#3B5998] transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm transition-all"
                                    placeholder="Tìm tên, mã GV, email, khoa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Filter Faculty */}
                            <div className="relative w-full sm:w-60">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={selectedFaculty}
                                    onChange={(e) => setSelectedFaculty(e.target.value)}
                                    className="block w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <option value="all">Tất cả Khoa / Viện</option>
                                    {faculties.map(khoa => (
                                        <option key={khoa.khoa_id} value={khoa.ten_khoa}>
                                            {khoa.ten_khoa}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Filter size={14} className="text-gray-400" />
                                </div>
                            </div>

                            <div className="relative w-full sm:w-60">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Filter className="h-4 w-4 text-gray-400" />
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
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                            >
                                <Upload size={16} /> <span className="hidden sm:inline">Import Excel</span>
                            </button>

                            {selectedIds.length > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors animate-in fade-in"
                                >
                                    <Trash2 size={16} /> <span className="hidden sm:inline">Xóa ({selectedIds.length})</span>
                                </button>
                            )}
                            
                            <button 
                                onClick={handleAddNew}
                                className="px-4 py-2 bg-[#3B5998] hover:bg-[#2e4676] text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
                            >
                                <Plus size={18} /> Thêm Giảng viên
                            </button>
                        </div>
                    </div>

                    {/* TABLE */}
                    <LecturerTable 
                        lecturers={filteredLecturers}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onCreateAccount={handleOpenCreateAccount}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                    />

                    {/* FOOTER */}
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                            Hiển thị {filteredLecturers.length} kết quả
                        </span>
                    </div>

                </div>
            </div>

            {/* --- MODALS --- */}
            
            {/* 1. Modal Thêm/Sửa */}
            <LecturerModal 
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSave={handleSave}
                initialData={currentLecturer}
                faculties={faculties}
            />

            {/* 2. Modal Xóa */}
            <DeleteConfirmModalLectures
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                subjectName={currentLecturer ? `${currentLecturer.ho} ${currentLecturer.ten}` : ''}
            />

            {/* 3. 🔥 MODAL IMPORT (Mới) */}
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
                                <h3 className="text-base font-bold text-gray-900">
                                    {accountTarget.TaiKhoan?.taikhoan_id ? 'Cập nhật tài khoản' : 'Tạo tài khoản đăng nhập'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    GV: <span className="font-semibold text-gray-700">{accountTarget.ho} {accountTarget.ten}</span>
                                    {accountTarget.ma_gv && <span className="ml-1 text-gray-400">({accountTarget.ma_gv})</span>}
                                </p>
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
                </div>
            )}
        </div>
    );
}