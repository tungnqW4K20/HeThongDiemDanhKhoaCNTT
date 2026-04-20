'use strict';

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Bell, Search, Settings, ChevronDown } from 'lucide-react';

const AdminLayout = () => {
    const { user } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [unreadCount, setUnreadCount] = useState(3); // Giả lập số thông báo

    const displayName = user?.name || user?.username || 'Người dùng';
    const displayInitial = displayName.charAt(0).toUpperCase();
    const roleLabelMap = {
        admin: 'Quản trị viên',
        lanhdao: 'Lãnh đạo',
        truongbomon: 'Trưởng bộ môn',
        giangvien: 'Giảng viên'
    };
    const roleLabel = roleLabelMap[user?.vaitro] || 'Người dùng hệ thống';

    // Xử lý hiệu ứng đổ bóng khi cuộn trang
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-sans antialiased text-slate-900">
            {/* Sidebar - Cố định bên trái */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-64 flex flex-col min-w-0">
                
                {/* --- HEADER CHUYÊN NGHIỆP --- */}
                {/* <header className={`h-20 flex items-center justify-between px-10 sticky top-0 z-[1000] transition-all duration-300 ${
                    scrolled 
                    ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50' 
                    : 'bg-transparent'
                }`}> */}

                <header className={`h-20 flex items-center justify-between px-10 sticky top-0 transition-all duration-300 ${
                    scrolled 
                    ? 'bg-white shadow-md border-b border-slate-200/50' // Bỏ opacity /80 để nền trắng đặc hoàn toàn
                    : 'bg-white' // Hoặc 'bg-transparent' tùy bạn, nhưng nên là màu đặc nếu muốn nó nổi lên
                } z-[1000]`}> {/* Thay z-500 bằng z-[1000] */}
                    
                    {/* Trái: Câu chào & Search bar ẩn dụ */}
                    <div className="flex flex-col">
                        <h2 className="text-[18px] font-bold text-slate-800 tracking-tight leading-tight">
                            Hệ thống Quản lý Đào tạo
                        </h2>
                        <p className="text-[18px] text-[#3B5998]  font-bold">
                            Trường ĐH Sư phạm Kỹ thuật Hưng Yên
                        </p>
                    </div>

                    {/* Phải: Actions & Profile */}
                    <div className="flex items-center gap-6">
                        
                        {/* <div className="hidden md:flex items-center bg-slate-200/50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Search size={16} className="text-slate-400" />
                            <input type="text" placeholder="Tìm nhanh..." className="bg-transparent border-none outline-none text-xs ml-2 w-32 focus:w-48 transition-all" />
                        </div>

                        <div className="relative group">
                            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#3B5998] hover:border-[#3B5998] hover:bg-blue-50 transition-all shadow-sm active:scale-90">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 h-4 min-w-[16px] px-1 bg-rose-500 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center -translate-y-1/3 translate-x-1/3 animate-bounce">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            
                            <div className="absolute top-full right-0 mt-2 w-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            </div>
                        </div>

                        <div className="h-8 w-[1px] bg-slate-200 mx-1"></div> */}

                        <button className="flex items-center gap-3 p-1.5 pr-4 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-2xl transition-all group active:scale-[0.98]">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-[#3B5998] to-[#6A89CC] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200 ring-2 ring-white">
                                    {displayInitial}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                            </div>
                            
                            <div className="hidden lg:flex flex-col items-start">
                                <span className="text-sm font-black text-slate-700 leading-none">
                                    {displayName}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                                    {roleLabel}
                                </span>
                            </div>

                            {/* <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-180" /> */}
                        </button>
                    </div>
                </header>

                {/* --- MAIN AREA --- */}
                <main className="p-10 relative">
                    {/* Background Decorative Element (Tăng chiều sâu) */}
                    <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white to-transparent pointer-events-none z-0"></div>
                    
                    <div className="relative z-10">
                        <Outlet />
                    </div>
                </main>

                {/* Footer ẩn (Optional) */}
                <footer className="mt-auto px-10 py-6 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        © 2026 UTEHY - Faculty of Information Technology
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;