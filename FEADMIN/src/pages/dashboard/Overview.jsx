'use strict';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  ClipboardCheck, 
  MapPin, 
  Clock, 
  Search,
  ArrowRight,
  UserX,
  School,
  BarChart3,
  Download,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList 
} from 'recharts';

// Import Service
import dashboardService from '../../service/dashboardService';

const Overview = () => {
  // --- STATE DỮ LIỆU ---
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartFilter, setChartFilter] = useState('week'); // 'day' | 'week' | 'month'

  const [stats, setStats] = useState({
    totalStudents: "0",
    totalClassesToday: 0,
    activeClasses: 0,
    avgAttendance: '0%',
    alertCount: 0
  });
  
  const [chartData, setChartData] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState([]);

  // --- EFFECT: Load dữ liệu tổng quan khi vào trang ---
  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getOverview(chartFilter);
        if (res.success && res.data) {
           setStats(res.data.stats);
           setChartData(res.data.chartData);
           setTodayClasses(res.data.todaySchedule);
           setAttendanceAlerts(res.data.alerts);
        }
      } catch (error) {
        console.error("Lỗi tải dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  // --- HANDLER: Đổi filter biểu đồ ---
  const handleChartFilterChange = async (filterType) => {
    if (filterType === chartFilter) return;
    
    setChartFilter(filterType);
    setChartLoading(true);
    try {
      const res = await dashboardService.getChartData(filterType);
      if (res.success && res.data) {
         setChartData(res.data);
      }
    } catch (error) {
      console.error("Lỗi tải biểu đồ:", error);
    } finally {
      setChartLoading(false);
    }
  };

  // --- UI HELPERS (Giữ nguyên logic giao diện cũ) ---
  const getFilterLabel = () => {
    switch(chartFilter) {
      case 'day': return 'hôm nay';
      case 'week': return 'tuần này';
      case 'month': return 'tháng này';
      default: return '';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-lg text-sm z-50">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-emerald-600 font-medium flex items-center justify-between gap-4">
              <span>Có mặt:</span> <span>{payload[0].value}%</span>
            </p>
            <p className="text-amber-500 font-medium flex items-center justify-between gap-4">
              <span>Đi muộn/Phép:</span> <span>{payload[1].value}%</span>
            </p>
            <p className="text-red-500 font-medium flex items-center justify-between gap-4">
              <span>Vắng:</span> <span>{payload[2].value}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (value <= 5) return null; 
    return (
      <text x={x + width / 2} y={y + height / 2 + 4} fill="#fff" textAnchor="middle" fontSize={11} fontWeight="bold">
        {value}%
      </text>
    );
  };

  const statCards = [
    { label: 'Tổng sinh viên', value: stats.totalStudents, sub: 'Đang hoạt động', icon: Users, bg: 'bg-blue-50', color: 'text-[#3B5998]' },
    { label: 'Lớp học hôm nay', value: stats.totalClassesToday, sub: `Đang diễn ra: ${stats.activeClasses}`, icon: CalendarDays, bg: 'bg-indigo-50', color: 'text-indigo-600' },
    { label: 'Tỉ lệ điểm danh', value: stats.avgAttendance, sub: 'Trung bình toàn trường', icon: ClipboardCheck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Cảnh báo vắng', value: stats.alertCount, sub: 'Sinh viên vắng nhiều', icon: UserX, bg: 'bg-red-50', color: 'text-red-600' },
  ];

  // Render Loading State
  if (loading) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-[#3B5998]" size={48} />
              <p className="mt-4 text-slate-500 font-medium uppercase tracking-widest text-xs">Đang tải dữ liệu tổng quan...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 font-sans text-slate-700 bg-slate-50 min-h-screen p-6">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Bảng điều khiển đào tạo</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Tìm lớp, giảng viên..." 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#3B5998] w-64 shadow-sm"
                />
            </div>
            <button className="bg-[#3B5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md flex items-center gap-2">
                <CalendarDays size={18} />
                Xem lịch toàn trường
            </button>
        </div>
      </div>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-[#3B5998]/30 transition-all hover:shadow-md cursor-default">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
                <span className="text-xs text-slate-400 mt-1 block">{stat.sub}</span>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- SECTION BIỂU ĐỒ --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
        {chartLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-xl">
                <Loader2 className="animate-spin text-[#3B5998]" size={32} />
            </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
                <h2 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
                    <BarChart3 size={20} />
                    Thống kê tỷ lệ tham gia lớp học
                </h2>
                <p className="text-sm text-slate-500 mt-1">Theo dõi tình trạng điểm danh của các lớp trong <span className="font-medium text-slate-700">{getFilterLabel()}</span></p>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {[
                  { id: 'day', label: 'Hôm nay' },
                  { id: 'week', label: 'Tuần này' },
                  { id: 'month', label: 'Tháng này' }
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => handleChartFilterChange(item.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartFilter === item.id ? 'bg-white text-[#3B5998] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="w-full h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {chartData.length > 0 ? (
                <div style={{ height: `${Math.max(400, chartData.length * 60)}px`, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            barSize={24}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" domain={[0, 100]} unit="%" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={{fill: '#475569', fontSize: 13, fontWeight: 500}} 
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9'}} />
                            <Legend verticalAlign="top" height={36} iconType="circle" formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>} />
                            
                            <Bar name="Có mặt" dataKey="present" stackId="a" fill="#10b981">
                                <LabelList dataKey="present" content={renderCustomLabel} />
                            </Bar>
                            <Bar name="Đi muộn / Phép" dataKey="late" stackId="a" fill="#f59e0b">
                                <LabelList dataKey="late" content={renderCustomLabel} />
                            </Bar>
                            <Bar name="Vắng không phép" dataKey="absent" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="absent" content={renderCustomLabel} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <BarChart3 size={48} className="mb-2 opacity-50" />
                    <p>Chưa có dữ liệu thống kê cho thời gian này</p>
                </div>
            )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
             <button className="text-sm text-[#3B5998] font-medium flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                <Download size={16} />
                Xuất báo cáo chi tiết (.xlsx)
             </button>
        </div>
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- Cột Trái: Lịch dạy chi tiết hôm nay --- */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
                        <School size={20} />
                        Lịch giảng dạy chi tiết
                    </h2>
                    <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-[#3B5998] rounded border border-blue-100">
                        Hôm nay
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-5 py-4">Môn học / Mã lớp</th>
                                <th className="px-5 py-4">Thời gian / Phòng</th>
                                <th className="px-5 py-4">Giảng viên</th>
                                <th className="px-5 py-4 text-center">Trạng thái</th>
                                <th className="px-5 py-4 text-right">Sĩ số</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {todayClasses.length > 0 ? todayClasses.map((cls) => (
                                <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-700">{cls.subject}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{cls.code}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-700">
                                            <Clock size={14} className="text-[#3B5998]" /> {cls.time}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                                            <MapPin size={14} /> {cls.room}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 font-medium text-slate-600">
                                        {cls.lecturer}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap
                                            ${cls.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                                              cls.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                                              'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            {cls.status === 'completed' ? 'Đã dạy' : (cls.status === 'cancelled' ? 'Đã hủy' : 'Sắp học')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono text-slate-600">
                                        {cls.attendance}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-5 py-8 text-center text-slate-400 italic">
                                        Không có lớp học nào diễn ra trong ngày hôm nay
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 mt-auto">
                    <button className="w-full py-2 text-sm text-[#3B5998] font-medium hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                        Xem toàn bộ lịch trình <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>

        {/* --- Cột Phải: Cảnh báo vắng --- */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <UserX size={20} className="text-red-500" />
                        Cảnh báo vắng
                    </h2>
                    <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                        {attendanceAlerts.length} trường hợp
                    </span>
                </div>
                <div className="space-y-4">
                    {attendanceAlerts.length > 0 ? attendanceAlerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-red-100 bg-red-50/30 transition-all hover:bg-red-50">
                            <div className="w-10 h-10 rounded-full bg-white border border-red-100 flex items-center justify-center text-red-600 font-bold text-xs shadow-sm shrink-0">
                                {alert.absentCount}b
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-700 text-sm truncate" title={alert.student}>{alert.student}</h4>
                                <p className="text-xs text-slate-500">{alert.idNum} - {alert.class}</p>
                                <p className="text-xs text-red-500 mt-1 font-medium truncate" title={alert.subject}>Môn: {alert.subject}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-400 text-center py-4">Hiện không có cảnh báo vi phạm chuyên cần</p>
                    )}
                </div>
                <button className="w-full mt-4 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-800 transition-colors">
                    Xem danh sách đầy đủ
                </button>
            </div>

            {/* Widget: Thao tác nhanh */}
            <div className="bg-[#3B5998] rounded-xl shadow-lg p-5 text-white">
                <h3 className="font-bold text-lg mb-2">Thao tác nhanh</h3>
                <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2 border border-white/10">
                        <ClipboardCheck size={16} className="text-blue-200" />
                        Xuất báo cáo điểm danh tháng
                    </button>
                    <button className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2 border border-white/10">
                        <CalendarDays size={16} className="text-blue-200" />
                        Tạo lịch bù / Lịch thi
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Overview;