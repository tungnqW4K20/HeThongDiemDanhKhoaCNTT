import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Plus, Shield, Trash2, Edit2, User, 
    Calendar, RefreshCw, Filter, X 
} from 'lucide-react';
import taiKhoanService from '../../service/taiKhoanService';
import giangVienService from '../../service/giangVienService';
import khoaService from '../../service/khoaService';
import TaiKhoanModal from '../../components/taikhoan/TaiKhoanModal';
import TaiKhoanStats from '../../components/taikhoan/TaiKhoanStats';
import DeleteConfirmModal from '../../components/lectures/DeleteConfirmModal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { toast } from 'react-hot-toast';

const Avatar = ({ name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B5998] to-[#4c6cb3] text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white ring-1 ring-gray-100 shrink-0 select-none">
      {initial}
    </div>
  );
};

const TaiKhoanManager = () => {
    const [accounts, setAccounts] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [boMons, setBoMons] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [vaitroFilter, setVaitroFilter] = useState('all');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [accRes, gvRes, bmRes, kRes] = await Promise.all([
                taiKhoanService.getAll(),
                giangVienService.getAll(),
                khoaService.getAllBoMon(),
                khoaService.getAll()
            ]);
            
            if (accRes.errCode === 0) setAccounts(accRes.data);
            if (gvRes.errCode === 0) setLecturers(gvRes.data);
            
            // Handle BoMon response
            const bmData = bmRes.data?.data || bmRes.data || bmRes;
            if (Array.isArray(bmData)) {
                setBoMons(bmData);
            }

            // Handle Khoa response
            const kData = kRes.data?.data || kRes.data || kRes;
            if (Array.isArray(kData)) {
                setFaculties(kData);
            }
        } catch (error) {
            console.error("Fetch data error:", error);
            toast.error("Không thể tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLecturers = async () => {
        try {
            const res = await giangVienService.getAll();
            const resData = res.data || res;
            if (Array.isArray(resData)) {
                setLecturers(resData);
            } else if (resData?.data && Array.isArray(resData.data)) {
                setLecturers(resData.data);
            }
        } catch (error) {
            console.error("Fetch lecturers error:", error);
        }
    };

    const handleSave = async (formData) => {
        try {
            let res;
            if (currentAccount) {
                res = await taiKhoanService.update(currentAccount.taikhoan_id, formData);
            } else {
                res = await taiKhoanService.create(formData);
            }

            if (res.errCode === 0) {
                toast.success(currentAccount ? "Cập nhật thành công" : "Tạo tài khoản thành công");
                setIsModalOpen(false);
                fetchData();
            } else {
                toast.error(res.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            console.error("Save account error:", error);
            toast.error("Lỗi server");
        }
    };

    const handleDelete = async () => {
        if (!currentAccount) return;
        try {
            const res = await taiKhoanService.delete(currentAccount.taikhoan_id);
            if (res.errCode === 0) {
                toast.success("Xóa tài khoản thành công");
                setIsDeleteModalOpen(false);
                fetchData();
            } else {
                toast.error(res.message || "Không thể xóa");
            }
        } catch (error) {
            console.error("Delete account error:", error);
            toast.error("Lỗi server");
        }
    };

    // Filter logic
    const filteredAccounts = useMemo(() => {
        return accounts.filter(acc => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                acc.username.toLowerCase().includes(searchLower) ||
                (acc.GiangVien && `${acc.GiangVien.ho} ${acc.GiangVien.ten}`.toLowerCase().includes(searchLower));
            const matchesRole = vaitroFilter === 'all' || acc.vaitro === vaitroFilter;
            return matchesSearch && matchesRole;
        });
    }, [accounts, searchTerm, vaitroFilter]);

    // Stats logic
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const newThisMonth = accounts.filter(acc => {
            const created = new Date(acc.ngay_tao);
            return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
        }).length;

        const adminCount = accounts.filter(acc => acc.vaitro === 'admin').length;

        return {
            total: accounts.length,
            newThisMonth,
            adminCount
        };
    }, [accounts]);

    // Pagination
    const {
        currentPage,
        totalPages,
        currentData,
        goToPage,
        resetPagination
    } = usePagination(filteredAccounts, 10);

    const getRoleBadge = (role) => {
        const roles = {
            admin: { label: 'Admin', color: 'bg-red-50 text-red-600 border-red-100' },
            giangvien: { label: 'Giảng viên', color: 'bg-blue-50 text-blue-600 border-blue-100' },
            truongbomon: { label: 'Trưởng bộ môn', color: 'bg-amber-50 text-amber-600 border-amber-100' },
            lanhdao: { label: 'Lãnh đạo', color: 'bg-purple-50 text-purple-600 border-purple-100' }
        };
        const r = roles[role] || { label: role, color: 'bg-gray-50 text-gray-600 border-gray-100' };
        return (
            <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold border ${r.color} uppercase tracking-wider`}>
                {r.label}
            </span>
        );
    };

    return (
        <div className="animate-in fade-in duration-500 text-slate-900 min-h-screen">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý Người dùng</h1>
                        <p className="text-gray-500 mt-1 text-sm">Quản lý hồ sơ người dùng, phân quyền và bảo mật tài khoản.</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <TaiKhoanStats 
                    totalAccounts={stats.total}
                    newThisMonth={stats.newThisMonth}
                    adminCount={stats.adminCount}
                />

                {/* Main Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col mt-6">
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
                                    className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm transition-all"
                                    placeholder="Tìm username hoặc tên giảng viên..."
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
                            
                            {/* Filter Role */}
                            <div className="relative w-full sm:w-60">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Shield className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={vaitroFilter}
                                    onChange={(e) => setVaitroFilter(e.target.value)}
                                    className="block w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <option value="all">Tất cả vai trò</option>
                                    <option value="admin">Quản trị viên</option>
                                    <option value="giangvien">Giảng viên</option>
                                    <option value="truongbomon">Trưởng bộ môn</option>
                                    <option value="lanhdao">Lãnh đạo</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Filter size={14} className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full xl:w-auto">
                            <button 
                                onClick={fetchData}
                                className={`p-2 text-gray-400 hover:text-[#3B5998] hover:bg-gray-50 rounded-lg transition-all ${isLoading ? 'animate-spin' : ''}`}
                                title="Làm mới"
                            >
                                <RefreshCw size={20} />
                            </button>

                            <button
                                onClick={() => {
                                    setCurrentAccount(null);
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center justify-center gap-2 px-5 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] transition-all shadow-sm font-bold text-sm shrink-0"
                            >
                                <Plus size={18} />
                                Thêm tài khoản
                            </button>
                        </div>
                    </div>

                    {/* Table section */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20">Tài khoản</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20 text-center">Vai trò</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20">Đơn vị quản lý</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20">Liên kết nhân sự</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20">Ngày tạo</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-[#3B5998] border-b border-[#3B5998]/20 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCw className="animate-spin text-[#3B5998]" size={32} />
                                                <span className="text-gray-400 font-bold text-sm">Đang tải danh sách...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <div className="bg-gray-50 p-4 rounded-full mb-3">
                                                    <Search size={32} strokeWidth={1.5} />
                                                </div>
                                                <p className="text-base font-medium text-gray-600">Không tìm thấy tài khoản nào</p>
                                                <p className="text-sm text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentData.map((acc) => (
                                    <tr key={acc.taikhoan_id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={acc.username} />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                        {acc.username}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        ID: {acc.taikhoan_id.substring(0, 8)}...
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {getRoleBadge(acc.vaitro)}
                                        </td>
                                        <td className="px-6 py-3">
                                            {acc.vaitro === 'truongbomon' ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {acc.DanhSachBoMonQuanLy && acc.DanhSachBoMonQuanLy.length > 0 ? (
                                                        acc.DanhSachBoMonQuanLy.map(bm => (
                                                            <span key={bm.bomon_id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {bm.ten_bomon}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 italic text-[11px]">Chưa phân bộ môn</span>
                                                    )}
                                                </div>
                                            ) : acc.vaitro === 'lanhdao' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                    {acc.KhoaQuanLy?.ten_khoa || 'Chưa phân khoa'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {acc.GiangVien ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-800">{acc.GiangVien.ho} {acc.GiangVien.ten}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        Mã GV: {acc.GiangVien.ma_gv}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-sm">Chưa liên kết</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar size={14} className="text-gray-400" />
                                                {new Date(acc.ngay_tao).toLocaleDateString('vi-VN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setCurrentAccount(acc);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-[#3B5998] hover:bg-blue-50 rounded transition-all"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCurrentAccount(acc);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-white border-t border-gray-100">
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                            totalItems={filteredAccounts.length}
                        />
                    </div>
                </div>
            </div>

            <TaiKhoanModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={currentAccount}
                lecturers={lecturers}
                boMons={boMons}
                faculties={faculties}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Xóa tài khoản người dùng"
                message={`Hành động này sẽ xóa vĩnh viễn tài khoản "${currentAccount?.username}". Bạn có chắc chắn muốn tiếp tục?`}
            />
        </div>
    );
};

export default TaiKhoanManager;
