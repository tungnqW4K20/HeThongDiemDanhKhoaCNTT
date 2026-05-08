import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Shield, User, Key, Link as LinkIcon, Search, Check, ChevronDown, BookOpen, Building2 } from 'lucide-react';

const SearchSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        if (selectedOption) {
            setSearchTerm(selectedOption.label);
        } else {
            setSearchTerm('');
        }
    }, [value, options]);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                if (selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else {
                    setSearchTerm('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedOption]);

    return (
        <div className="relative" ref={dropdownRef}>
            <style dangerouslySetInnerHTML={{ __html: `
                .thin-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .thin-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .thin-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .thin-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}} />
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 focus:border-[#3B5998] transition-all text-sm bg-white cursor-text"
                    placeholder={placeholder}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchTerm && (
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearchTerm('');
                                onChange('');
                                setIsOpen(true);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[10000] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 thin-scrollbar">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <div
                                key={opt.value}
                                className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors
                                    ${value === opt.value ? 'bg-blue-50 text-[#3B5998] font-bold' : 'text-gray-600'}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setSearchTerm(opt.label);
                                    setIsOpen(false);
                                }}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={14} />}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center italic">Không tìm thấy kết quả</div>
                    )}
                </div>
            )}
        </div>
    );
};

const TaiKhoanModal = ({ isOpen, onClose, onSave, initialData, lecturers = [], boMons = [], faculties = [] }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        vaitro: 'giangvien',
        ref_id: '',
        managed_bomon_ids: [],
        managed_khoa_id: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            const managed_ids = initialData.DanhSachBoMonQuanLy ? initialData.DanhSachBoMonQuanLy.map(bm => bm.bomon_id) : [];
            setFormData({
                username: initialData.username || '',
                password: '', 
                vaitro: initialData.vaitro || 'giangvien',
                ref_id: initialData.ref_id || '',
                managed_bomon_ids: managed_ids,
                managed_khoa_id: initialData.KhoaQuanLy?.khoa_id || ''
            });
        } else {
            setFormData({
                username: '',
                password: '',
                vaitro: 'giangvien',
                ref_id: '',
                managed_bomon_ids: [],
                managed_khoa_id: ''
            });
        }
        setErrors({});
    }, [initialData, isOpen]);

    const validate = () => {
        const newErrors = {};
        if (!formData.username.trim()) newErrors.username = 'Tên đăng nhập là bắt buộc';
        if (!initialData && !formData.password.trim()) newErrors.password = 'Mật khẩu là bắt buộc';
        if (formData.vaitro === 'truongbomon' && formData.managed_bomon_ids.length === 0) {
            newErrors.managed_bomon_ids = 'Vui lòng chọn ít nhất một bộ môn quản lý';
        }
        if (formData.vaitro === 'lanhdao' && !formData.managed_khoa_id) {
            newErrors.managed_khoa_id = 'Vui lòng chọn khoa quản lý';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };

    const toggleBoMon = (id) => {
        const current = [...formData.managed_bomon_ids];
        const index = current.indexOf(id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(id);
        }
        setFormData({ ...formData, managed_bomon_ids: current });
    };

    if (!isOpen) return null;

    const lecturerOptions = lecturers.map(gv => ({
        value: gv.giangvien_id,
        label: `${gv.ma_gv} - ${gv.ho} ${gv.ten}`
    }));

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200 max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
                        <Shield size={18}/>
                        {initialData ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto thin-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Vai trò */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Vai trò</label>
                            <select
                                value={formData.vaitro}
                                onChange={(e) => setFormData({ ...formData, vaitro: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm bg-white"
                            >
                                <option value="admin">Quản trị viên (Admin)</option>
                                <option value="giangvien">Giảng viên</option>
                                <option value="truongbomon">Trưởng bộ môn</option>
                                <option value="lanhdao">Lãnh đạo</option>
                            </select>
                        </div>

                        {/* Liên kết Giảng viên */}
                        {formData.vaitro !== 'admin' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Liên kết Giảng viên</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                                    <SearchSelect 
                                        options={lecturerOptions}
                                        value={formData.ref_id}
                                        onChange={(val) => setFormData({ ...formData, ref_id: val })}
                                        placeholder="-- Gõ tên hoặc mã để tìm giảng viên --"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quản lý bộ môn (Chỉ dành cho Trưởng bộ môn) */}
                        {formData.vaitro === 'truongbomon' && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen size={14} className="text-[#3B5998]" />
                                    Bộ môn quản lý
                                </label>
                                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2 max-h-40 overflow-y-auto thin-scrollbar">
                                    {boMons.map(bm => (
                                        <label key={bm.bomon_id} className="flex items-center gap-3 cursor-pointer group">
                                            <div 
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                                    ${formData.managed_bomon_ids.includes(bm.bomon_id) 
                                                        ? 'bg-[#3B5998] border-[#3B5998]' 
                                                        : 'border-gray-300 bg-white group-hover:border-[#3B5998]'}`}
                                                onClick={() => toggleBoMon(bm.bomon_id)}
                                            >
                                                {formData.managed_bomon_ids.includes(bm.bomon_id) && <Check size={10} className="text-white" />}
                                            </div>
                                            <span className={`text-sm ${formData.managed_bomon_ids.includes(bm.bomon_id) ? 'text-[#3B5998] font-medium' : 'text-gray-600'}`}>
                                                {bm.ten_bomon}
                                            </span>
                                        </label>
                                    ))}
                                    {boMons.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">Đang tải danh sách bộ môn...</p>
                                    )}
                                </div>
                                {errors.managed_bomon_ids && <p className="text-red-500 text-[10px] mt-1 font-medium italic">{errors.managed_bomon_ids}</p>}
                            </div>
                        )}

                        {/* Quản lý khoa (Chỉ dành cho Lãnh đạo) */}
                        {formData.vaitro === 'lanhdao' && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider flex items-center gap-2">
                                    <Building2 size={14} className="text-[#3B5998]" />
                                    Khoa quản lý
                                </label>
                                <select
                                    value={formData.managed_khoa_id}
                                    onChange={(e) => setFormData({ ...formData, managed_khoa_id: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm bg-white
                                        ${errors.managed_khoa_id ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                                >
                                    <option value="">-- Chọn khoa --</option>
                                    {faculties.map(k => (
                                        <option key={k.khoa_id} value={k.khoa_id}>{k.ten_khoa}</option>
                                    ))}
                                </select>
                                {errors.managed_khoa_id && <p className="text-red-500 text-[10px] mt-1 font-medium italic">{errors.managed_khoa_id}</p>}
                            </div>
                        )}

                        <div className="border-t border-gray-50 my-2"></div>

                        {/* Username */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Tên đăng nhập</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                                        ${errors.username ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                                    placeholder="VD: admin_cntt"
                                />
                            </div>
                            {errors.username && <p className="text-red-500 text-[10px] mt-1 font-medium italic">{errors.username}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                                {initialData ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5998]/20 transition-all text-sm
                                        ${errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#3B5998]'}`}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && <p className="text-red-500 text-[10px] mt-1 font-medium italic">{errors.password}</p>}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-5 py-2 bg-[#3B5998] text-white rounded-lg hover:bg-[#2e4676] font-medium transition-all shadow-md shadow-blue-100 flex items-center gap-2 text-sm"
                    >
                        <Save size={16} />
                        {initialData ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TaiKhoanModal;
