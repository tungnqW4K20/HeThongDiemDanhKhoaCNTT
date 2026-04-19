import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, GraduationCap, Search, X, Mail, Phone, 
  Calendar, Edit2, Trash2, Plus, Loader2, Upload, UserCheck 
} from 'lucide-react'; 
import Badge from './Badge';
import Avatar from './Avatar';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditStudentModal from './EditStudentModal';
import AddStudentModal from './AddStudentModal';
import ImportStudentModal from './ImportStudentModal';
import studentService from '../../service/studentService';

const ClassDetailView = ({ classInfo, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsList, setStudentsList] = useState([]); 
  const [gvcn, setGvcn] = useState(null); // Lưu thông tin GVCN từ API
  const [loading, setLoading] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fetch dữ liệu từ API
  const fetchStudents = async () => {
    if (!classInfo?.id) return;
    setLoading(true);
    try {
        const res = await studentService.getByClass(classInfo.id);
        // Cấu trúc API: res.data.danh_sach_sinh_vien & res.data.giang_vien_chu_nhiem
        if (res && res.success) {
            setStudentsList(res.data.danh_sach_sinh_vien || []);
            setGvcn(res.data.giang_vien_chu_nhiem || null);
        } else {
            console.error("Format data không đúng:", res);
            setStudentsList([]);
        }
    } catch (error) {
        console.error("Lỗi lấy danh sách sinh viên:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classInfo]);

  // --- HÀM XỬ LÝ LOGIC (GIỮ NGUYÊN) ---
  const handleAddStudent = async (newStudentData) => {
    try {
        const res = await studentService.create(newStudentData);
        if (res.success || res.errCode === 0) {
            alert(res.message || "Thêm thành công");
            setAddModalOpen(false);
            fetchStudents(); 
        } else {
            alert("Thêm thất bại: " + res.message);
        }
    } catch (error) {
        console.error("Lỗi thêm sinh viên:", error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage || "Có lỗi xảy ra khi thêm sinh viên");
    }
  };

  const handleConfirmEdit = async (updatedStudent) => {
    try {
        const res = await studentService.update(updatedStudent.sinhvien_id, updatedStudent);
        if (res.success || res.errCode === 0) {
            alert(res.message || "Cập nhật thành công");
            setEditModalOpen(false);
            setSelectedStudent(null);
            fetchStudents(); 
        } else {
            alert("Cập nhật thất bại: " + res.message);
        }
    } catch (error) {
        console.error("Lỗi cập nhật sinh viên:", error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage || "Có lỗi xảy ra khi cập nhật sinh viên");
    }
  };

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
        const res = await studentService.delete(selectedStudent.sinhvien_id);
        if (res.success || res.errCode === 0) {
             setStudentsList(prev => prev.filter(s => s.sinhvien_id !== selectedStudent.sinhvien_id));
             setDeleteModalOpen(false);
             setSelectedStudent(null);
        } else {
            alert("Xóa thất bại: " + res.message);
        }
    } catch (error) {
        console.error("Lỗi xóa sinh viên:", error);
        alert("Có lỗi xảy ra khi xóa");
    }
  };

  const handleEditClick = (student) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleImportStudent = async (file, classId) => {
    try {
      const res = await studentService.importExcel(file, classId);
      if (res && (res.success || res.errCode === 0)) {
        alert(res.message || "Import thành công!");
        setImportModalOpen(false);
        fetchStudents(); 
      } else {
        throw new Error(res.message || "Import thất bại");
      }
    } catch (error) {
      console.error("Import Error:", error);
      const errorResponse = error.response?.data || {};
      const errorMessage = errorResponse.message || error.message || "Lỗi server";
      const customError = new Error(errorMessage);
      customError.details = errorResponse.details || [];
      throw customError;
    }
  };

  const filteredStudents = studentsList.filter(sv => 
    (sv.ten && sv.ten.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (sv.ma_sv && sv.ma_sv.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString) => {
      if(!dateString) return "---";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
      } catch { return dateString; }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Modals */}
      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        studentName={selectedStudent?.ten}
      />
      <EditStudentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleConfirmEdit}
        student={selectedStudent}
      />
      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddStudent}
        classId={classInfo.id}
      />
      <ImportStudentModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportStudent}
        classId={classInfo.id}
      />

      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-gray-500 hover:text-[#3B5998] transition-colors font-medium text-sm"
        >
          <div className="p-1.5 rounded-full bg-white border border-gray-200 group-hover:border-[#3B5998] transition-colors">
            <ArrowLeft size={16} />
          </div>
          Quay lại danh sách
        </button>
        <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download size={16}/> Xuất Excel
            </button>
            <button 
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
            >
                <Upload size={16}/> Import Excel
            </button>
            <button 
                onClick={() => setAddModalOpen(true)}
                className="px-4 py-2 bg-[#3B5998] text-white text-sm font-medium rounded-lg hover:bg-[#2e4676] flex items-center gap-2 transition-colors shadow-sm"
            >
                <Plus size={16}/> Thêm sinh viên
            </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <GraduationCap size={120} className="text-[#3B5998]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <Badge type="blue">Chính quy</Badge>
                <Badge type="gray">Khóa {classInfo.year}</Badge>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-1">{classInfo.name}</h1>
            <p className="text-sm text-gray-400 mt-1 uppercase font-semibold">{classInfo.department}</p>

            <div className="mt-6 flex items-center gap-10">
                <div>
                     <p className="text-xs text-gray-500 uppercase font-semibold">Tổng sinh viên</p>
                     <p className="font-bold text-2xl text-[#3B5998]">{studentsList.length}</p>
                </div>
                
                {/* HIỂN THỊ GVCN VÀ SĐT NHANH Ở ĐÂY */}
                {gvcn && (
                  <div className="border-l pl-10">
                      <p className="text-xs text-gray-500 uppercase font-semibold">GV Chủ nhiệm</p>
                      <p className="font-bold text-gray-700">{gvcn.ho_ten}</p>
                      <p className="text-sm text-[#3B5998] flex items-center gap-1.5 font-medium mt-0.5">
                        <Phone size={13} /> {gvcn.sdt || "Chưa có SĐT"}
                      </p>
                  </div>
                )}
            </div>
          </div>
        </div>
        
        {/* Thông tin GVCN Card (Bên phải) */}
        <div className="bg-gradient-to-br from-[#3B5998] to-[#2e4676] rounded-xl p-6 shadow-md text-white flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck size={20} className="text-blue-200" />
                  <h3 className="font-semibold text-lg">Giảng viên chủ nhiệm</h3>
                </div>
                {gvcn ? (
                  <div className="space-y-3">
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Họ và tên</p>
                        <p className="text-base font-semibold">{gvcn.ho_ten}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Số điện thoại</p>
                        <p className="text-base font-bold flex items-center gap-2">
                          <Phone size={14} className="text-green-400" /> {gvcn.sdt || "---"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Email liên hệ</p>
                        <p className="text-sm text-blue-50 flex items-center gap-2 italic">
                          <Mail size={14} /> {gvcn.email || "Chưa cập nhật"}
                        </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-blue-100 text-sm italic">Chưa phân công giảng viên</p>
                )}
            </div>
            <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10 backdrop-blur-sm">
                Gửi thông báo nhanh
            </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
           <h3 className="font-bold text-gray-800 text-lg">Danh sách sinh viên</h3>
           <div className="flex gap-2">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-[#3B5998]" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên hoặc mã SV..." 
                  className="pl-9 pr-8 py-1.5 text-xs border border-gray-300 rounded-md w-56 focus:outline-none focus:border-[#3B5998] focus:ring-1 focus:ring-[#3B5998]"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
             </div>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#3B5998]/10 border-b border-[#3B5998]/10">
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[10%]">Mã SV</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[20%]">Họ và tên</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[20%]">Liên hệ</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[15%]">Ngày sinh</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[10%]">Trạng thái</th>
                <th className="px-6 py-3 font-bold text-[#3B5998] text-xs uppercase tracking-wider w-[15%] text-center">Chức năng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                        <div className="flex justify-center items-center gap-2 text-gray-500">
                             <Loader2 className="animate-spin" size={20} /> Đang tải dữ liệu...
                        </div>
                    </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((sv) => (
                  <tr key={sv.sinhvien_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500 font-medium">{sv.ma_sv}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={sv.ten} />
                        <span className="font-medium text-gray-900">{sv.ten}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                          <Mail size={12} className="text-gray-400" /> {sv.email || "---"}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                          <Phone size={12} className="text-gray-400" /> {sv.sdt || "---"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" /> {formatDate(sv.ngaysinh)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge type={sv.trang_thai === 'Cảnh báo' ? 'yellow' : 'green'}>
                          {sv.trang_thai || 'Đang học'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(sv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(sv)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa sinh viên"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 italic">
                    Lớp chưa có sinh viên nào hoặc không tìm thấy kết quả.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailView;