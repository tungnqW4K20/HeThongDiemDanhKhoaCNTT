import React, { useState } from 'react';
import { LockKeyhole, Loader2 } from 'lucide-react';
import authService from '../../service/authService';

const ChangePasswordPage = () => {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' });
      return;
    }

    if (form.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword({
        current_password: form.current_password,
        new_password: form.new_password
      });

      if (res?.success) {
        setMessage({ type: 'success', text: res.message || 'Đổi mật khẩu thành công.' });
        setForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setMessage({ type: 'error', text: res?.message || 'Đổi mật khẩu thất bại.' });
      }
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      setMessage({ type: 'error', text: serverMessage || error.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h1 className="text-2xl font-bold text-[#3B5998]">Đổi mật khẩu</h1>
          <p className="mt-1 text-sm text-gray-500">Cập nhật mật khẩu đăng nhập cho tài khoản của bạn.</p>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu hiện tại</span>
            <input
              type="password"
              value={form.current_password}
              onChange={(e) => handleChange('current_password', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
              autoComplete="current-password"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu mới</span>
            <input
              type="password"
              value={form.new_password}
              onChange={(e) => handleChange('new_password', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</span>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => handleChange('confirm_password', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
              autoComplete="new-password"
            />
          </label>

          {message.text ? (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B5998] px-4 py-2 font-medium text-white hover:bg-[#2f4778] disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
            {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
