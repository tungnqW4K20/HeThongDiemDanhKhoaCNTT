import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpenCheck,
  CalendarDays,
  LogOut,
  School,
  Layers,
  Library,
  UserPlus,
  CalendarRange,
  Building2,
  ListTree,
  KeyRound,
  Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const isLanhDao = user?.vaitro === 'lanhdao';
  const isTruongBoMon = user?.vaitro === 'truongbomon';
  const isQuanLyTheoDonVi = isLanhDao || isTruongBoMon;

  const adminMenuItems = [
    { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { path: '/attendance', label: 'Quản lý điểm danh', icon: BookOpenCheck },
    { path: '/semester', label: 'Quản lý học kỳ', icon: CalendarRange },
    { path: '/lecturers', label: 'Quản lý giảng viên', icon: GraduationCap },
    { path: '/users', label: 'Quản lý người dùng', icon: Shield },
    { path: '/classes', label: 'Quản lý lớp hành chính', icon: Layers },
    { path: '/subjects', label: 'Quản lý môn học', icon: BookOpenCheck },
    { path: '/schedule', label: 'Phân công lịch dạy', icon: CalendarDays },
    { path: '/department', label: 'Quản lý khoa', icon: Building2 },
    { path: '/co-so', label: 'Quản lý cơ sở', icon: School },
    { path: '/bo-mon', label: 'Quản lý bộ môn', icon: Library },
    { path: '/chuyen-nganh', label: 'Quản lý chuyên ngành', icon: UserPlus },
    { path: '/part-class', label: 'Quản lý lớp học phần', icon: ListTree },
    { path: '/change-password', label: 'Đổi mật khẩu', icon: KeyRound }
  ];

  const lanhDaoMenuItems = [
    { path: '/', label: 'Thống kê điểm danh', icon: LayoutDashboard },
    { path: '/lecturers', label: 'Quản lý giảng viên', icon: GraduationCap },
    { path: '/schedule', label: 'Phân công lịch dạy', icon: CalendarDays },
    ...(isLanhDao ? [{ path: '/bo-mon', label: 'Quản lý bộ môn', icon: Library }] : []),
    ...(isLanhDao ? [{ path: '/classes', label: 'Quản lý lớp hành chính', icon: Layers }] : []),
    { path: '/part-class', label: 'Quản lý lớp học phần', icon: ListTree },
    { path: '/change-password', label: 'Đổi mật khẩu', icon: KeyRound }
  ];

  const menuItems = isQuanLyTheoDonVi ? lanhDaoMenuItems : adminMenuItems;

  return (
    <aside className="w-64 bg-[#3B5998] text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50 transition-all duration-300 font-sans border-r border-blue-800">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10 bg-[#324c85]">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <School className="text-[#3B5998]" size={24} />
        </div>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-wide text-white leading-none">UTEHY</h1>
          <span className="text-[11px] text-blue-200 font-medium tracking-wider uppercase mt-1">Quản lý đào tạo</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 space-y-1.5 px-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 group relative
                ${isActive ? 'bg-white text-[#3B5998] shadow-md' : 'text-blue-100 hover:bg-[#4a6bb0] hover:text-white'}`}
            >
              <item.icon
                size={20}
                className={`transition-colors duration-200 ${isActive ? 'text-[#3B5998]' : 'text-blue-200 group-hover:text-white'}`}
              />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && <div className="absolute right-3 w-2 h-2 rounded-full bg-[#3B5998]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 bg-[#324c85]">
        <div className="mb-3 px-2">
          <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold opacity-70">Hệ thống quản lý đào tạo UTEHY</p>
          {user && (
            <p className="text-[11px] text-white mt-1 font-bold">
              {user.username}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${isQuanLyTheoDonVi ? 'bg-yellow-400/20 text-yellow-300' : 'bg-green-400/20 text-green-300'}`}>
                {isLanhDao ? 'Lãnh đạo' : isTruongBoMon ? 'Trưởng bộ môn' : 'Admin'}
              </span>
            </p>
          )}
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-black/20 text-blue-100 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-200 group backdrop-blur-sm"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
