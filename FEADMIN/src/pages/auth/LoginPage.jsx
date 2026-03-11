import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; 
import { User, Lock, LogIn, ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      alert('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu!');
      return;
    }

    setIsSubmitting(true); 

    try {
      const result = await login(username, password);

      if (result.success) {
        navigate('/'); 
      } else {
        alert(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans">
      {/* Cột bên trái - Banner/Logo (GIỮ NGUYÊN) */}
      <div className="lg:w-1/2 relative flex flex-col items-center justify-center p-12 bg-[#0054a6] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#004285] to-[#002855] opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          
          <div className="w-56 h-56 bg-white rounded-full flex items-center justify-center shadow-2xl mb-8 p-8 ring-8 ring-white/20 backdrop-blur-sm">
            <img 
              src="data:image/png;base64,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" 
              alt="UTEHY Logo" 
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 uppercase tracking-wide drop-shadow-lg">
            Đại học Sư phạm Kỹ thuật Hưng Yên
          </h1>
          <p className="text-blue-100 text-lg font-light tracking-wider">
            Hệ thống Quản lý Đào tạo & Công tác Sinh viên
          </p>
          
          <div className="mt-12 flex gap-4 text-blue-200 text-sm font-medium">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <ShieldCheck size={16} /> Bảo mật cao
            </div>
            <div className="w-px h-auto bg-blue-400/50"></div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
               Hỗ trợ 24/7
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full">
            <svg viewBox="0 0 1440 320" className="w-full h-auto opacity-20 text-white fill-current">
                <path fillOpacity="1" d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,133.3C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
        </div>
      </div>

      {/* Cột bên phải - Form đăng nhập */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,_0,_0,_0.1)] border border-slate-100">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-800 uppercase text-[#0054a6]">Đăng nhập hệ thống</h2>
                <p className="text-slate-500 mt-2 text-sm">Vui lòng nhập thông tin tài khoản cán bộ/giảng viên</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Tài khoản</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0054a6] transition-colors">
                        <User size={20} />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0054a6] focus:border-transparent outline-none transition-all duration-200 text-slate-700 placeholder-slate-400 font-medium"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Mã cán bộ / Email"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Mật khẩu</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0054a6] transition-colors">
                        <Lock size={20} />
                    </div>
                    <input
                        type="password"
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0054a6] focus:border-transparent outline-none transition-all duration-200 text-slate-700 placeholder-slate-400 font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                    />
                </div>
                {/* <div className="flex justify-end">
                    <a href="#" className="text-sm text-[#0054a6] hover:text-blue-800 font-medium hover:underline">Quên mật khẩu?</a>
                </div> */}
            </div>

            <button
                type="submit"
                disabled={isSubmitting} 
                className={`w-full bg-[#0054a6] hover:bg-[#003d7a] text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {isSubmitting ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
            </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
                <p className="text-xs text-slate-400">
                    &copy; 2024 Hung Yen University of Technology and Education.<br/>All rights reserved.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;