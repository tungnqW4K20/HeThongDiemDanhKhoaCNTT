import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, X, Trash2, Building2, RefreshCw, Upload } from 'lucide-react'; // Đã thêm icon Upload
import LecturerTable from '../../components/lectures/LecturerTable';
import LecturerStats from '../../components/lectures/LecturerStats';
import LecturerModal from '../../components/lectures/LecturerModal';
import DeleteConfirmModalLectures from '../../components/lectures/DeleteConfirmModal';
import ImportLecturerModal from '../../components/lectures/ImportLecturerModal'; // Component Import Mới
import giangVienService from '../../service/giangVienService';
import khoaService from '../../service/khoaService';

export default function LecturerManagerPage() {
    // --- STATE ---
    const [lecturers, setLecturers] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('all'); 
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); // State Modal Import
    const [importLoading, setImportLoading] = useState(false); // Loading state cho Import
    
    const [currentLecturer, setCurrentLecturer] = useState(null);

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
            if (Array.isArray(resData)) setFaculties(resData);
        } catch (error) {
            console.error("Lỗi lấy danh sách khoa:", error);
        }
    };

    // --- FILTER LOGIC ---
    const filteredLecturers = useMemo(() => {
        return lecturers.filter(gv => {
            const searchLower = searchTerm.toLowerCase();
            const khoaName = gv.Khoa ? gv.Khoa.ten_khoa : '';

            const matchesSearch = 
                (gv.ten && gv.ten.toLowerCase().includes(searchLower)) || 
                (gv.ho && gv.ho.toLowerCase().includes(searchLower)) ||
                (gv.ma_gv && gv.ma_gv.toLowerCase().includes(searchLower)) ||
                (gv.email && gv.email.toLowerCase().includes(searchLower));

            const matchesFaculty = selectedFaculty === 'all' || khoaName === selectedFaculty;

            return matchesSearch && matchesFaculty;
        });
    }, [lecturers, searchTerm, selectedFaculty]);

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

    const handleSave = async (formData) => {
        try {
            if (currentLecturer) {
                const res = await giangVienService.update(currentLecturer.giangvien_id, formData);
                const resData = res.data || res; 
                
                if (resData.success || resData.errCode === 0) { 
                    alert("Cập nhật thành công!"); 
                    fetchData(); 
                    setIsFormModalOpen(false);
                } else {
                    alert(resData.message || "Lỗi cập nhật");
                }
            } else {
                const res = await giangVienService.create(formData);
                const resData = res.data || res;
                
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
                const resData = res.data || res;
                
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
        <div className="min-h-screen bg-[#F0F2F5] p-6 md:p-8 font-sans text-slate-900">
            <div className="max-w-[1400px] mx-auto mb-8">
                
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
                                    placeholder="Tìm tên, mã GV, email..."
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
        </div>
    );
}