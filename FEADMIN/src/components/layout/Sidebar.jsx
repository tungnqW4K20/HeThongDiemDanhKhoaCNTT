import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpenCheck, 
  CalendarDays, 
  ClipboardCheck, 
  LogOut,
  School,
  Layers, // Icon cho quản lý lớp
  Library,
  UserPlus,
  Repeat,
  CalendarRange,
  Building2,  // Icon thay thế cho môn học (nếu thích)
  BookOpen,
  ListTree
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const isLanhDao = user?.vaitro === 'lanhdao';

  // Menu đầy đủ cho Admin
  const adminMenuItems = [
    { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { path: '/semester', label: 'Quản lý học kỳ', icon: CalendarRange },
    { path: '/lecturers', label: 'Quản lý giảng viên', icon: GraduationCap },
    { path: '/classes', label: 'Quản lý lớp hành chính', icon: Layers },
    { path: '/subjects', label: 'Quản lý môn học', icon: BookOpenCheck },
    { path: '/schedule', label: 'Phân công lịch dạy', icon: CalendarDays },
    { path: '/department', label: 'Quản lý khoa', icon: Building2 },
    { path: '/part-class', label: 'Quản lý lớp học phần', icon: ListTree },
  ];

  const lanhDaoMenuItems = [
    { path: '/', label: 'Thống kê điểm danh', icon: LayoutDashboard },
    { path: '/lecturers', label: 'Quản lý giảng viên', icon: GraduationCap }, // Lãnh đạo xem GV khoa mình
    // { path: '/classes', label: 'Quản lý lớp hành chính', icon: Layers },
    // { path: '/subjects', label: 'Quản lý môn học', icon: BookOpenCheck },
    { path: '/schedule', label: 'Phân công lịch dạy', icon: CalendarDays },
    { path: '/part-class', label: 'Quản lý lớp học phần', icon: ListTree },
    // Không thêm /semester và /department vì đây là quyền tối cao của Admin
  ];

  const menuItems = isLanhDao ? lanhDaoMenuItems : adminMenuItems;

  return (
    // Background đổi sang màu chủ đạo #3B5998
    <aside className="w-64 bg-[#3B5998] text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50 transition-all duration-300 font-sans border-r border-blue-800">
      
      {/* --- Logo Area --- */}
      {/* Nền logo đậm hơn một chút để tạo sự tách biệt */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10 bg-[#324c85]">
        {/* <div className="p-2 bg-white rounded-lg shadow-sm">
          <School className="text-[#3B5998]" size={26} />
        </div> */}

        <div className="p-2 bg-white rounded-lg shadow-sm">
          <img 
            src="data:image/png;base64,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" 
            alt="icon" 
            className="w-6 h-6 object-contain" 
          />
        </div>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-wide text-white leading-none">
            UTEHY
          </h1>
          <span className="text-[11px] text-blue-200 font-medium tracking-wider uppercase mt-1">
            Quản lý đào tạo
          </span>
        </div>
      </div>

      {/* --- Menu Items --- */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-1.5 px-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-white text-[#3B5998] shadow-md' // Active: Nền trắng, chữ Xanh
                  : 'text-blue-100 hover:bg-[#4a6bb0] hover:text-white' // Hover: Sáng hơn chút
                }`}
            >
              <item.icon 
                size={20} 
                className={`transition-colors duration-200 ${isActive ? 'text-[#3B5998]' : 'text-blue-200 group-hover:text-white'}`} 
              />
              <span className="font-medium text-sm">
                {item.label}
              </span>
              
              {/* Active Indicator (Dấu hiệu nhận biết đang chọn) - Đổi sang kiểu chấm tròn tinh tế */}
              {isActive && (
                 <div className="absolute right-3 w-2 h-2 rounded-full bg-[#3B5998]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* --- Footer / User Info --- */}
      <div className="p-4 border-t border-white/10 bg-[#324c85]">
        <div className="mb-3 px-2">
            <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold opacity-70">Hệ thống quản lý đào tạo UTEHY </p>
            {user && (
              <p className="text-[11px] text-white mt-1 font-bold">
                {user.username} 
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${isLanhDao ? 'bg-yellow-400/20 text-yellow-300' : 'bg-green-400/20 text-green-300'}`}>
                  {isLanhDao ? 'Lãnh đạo' : 'Admin'}
                </span>
              </p>
            )}
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 
            bg-black/20 text-blue-100 hover:bg-red-500 hover:text-white 
            rounded-lg transition-all duration-200 group backdrop-blur-sm"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;