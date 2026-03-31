import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Upload } from 'lucide-react'; 
import SubjectTable from '../../components/subjects/SubjectTable';
import SubjectModal from '../../components/subjects/SubjectModal';
import DeleteConfirmModal from '../../components/subjects/DeleteConfirmModal';
import ImportSubjectModal from '../../components/subjects/ImportSubjectModal'; 
import SubjectStats from '../../components/subjects/SubjectStats';
import monHocService from '../../service/monhocService';

export default function SubjectManagerPage() {
  // --- STATE MANAGEMENT ---
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoMon, setSelectedBoMon] = useState('all');
  
  // State quản lý Import
  const [importLoading, setImportLoading] = useState(false);
  
  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  
  const [currentSubject, setCurrentSubject] = useState(null);

  // --- API CALLS ---
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      // Vì axiosClient đã trả về response.data, nên biến 'data' ở đây chính là nội dung JSON từ server
      const data = await monHocService.getAll();
      
      // Xử lý tùy theo cấu trúc JSON server trả về. 
      // Nếu server trả về mảng trực tiếp: [ {}, {} ] -> data là mảng
      // Nếu server trả về object: { data: [ ... ], success: true } -> data.data là mảng
      const listSubject = Array.isArray(data) ? data : (data.data || []);
      
      if (Array.isArray(listSubject)) {
        const formattedData = listSubject.map(sub => ({
            ...sub,
            ma_khoa: sub.Khoa ? sub.Khoa.ma_khoa : '', 
            ten_khoa: sub.Khoa ? sub.Khoa.ten_khoa : '',
          khoa_id: sub.khoa_id,
          bo_mon_id: sub.BoMon?.bomon_id || sub.BoMon?.chuyennganh_id || sub.bomon_id || sub.chuyennganh_id || null,
          ten_bo_mon: sub.BoMon?.ten_chuyennganh || sub.BoMon?.ten_bomon || ''
        }));
        setSubjects(formattedData);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách môn học:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // --- STATS & FILTER ---
  const totalCredits = useMemo(() => subjects.reduce((acc, curr) => acc + (curr.sotinchi || 0), 0), [subjects]);

  const boMonOptions = useMemo(() => {
    const map = new Map();
    subjects.forEach((sub) => {
      if (sub.bo_mon_id && sub.ten_bo_mon) {
        map.set(sub.bo_mon_id, sub.ten_bo_mon);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      const matchesSearch =
        (sub.ten_mon && sub.ten_mon.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sub.ma_mon && sub.ma_mon.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesBoMon = selectedBoMon === 'all' || sub.bo_mon_id === selectedBoMon;
      return matchesSearch && matchesBoMon;
    });
  }, [subjects, searchTerm, selectedBoMon]);

  // --- HANDLERS CRUD ---
  
  const handleAddNew = () => {
    setCurrentSubject(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (subject) => {
    setCurrentSubject(subject);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (subject) => {
    setCurrentSubject(subject);
    setIsDeleteModalOpen(true);
  };

  const handleSaveSubject = async (formData) => {
    try {
      if (currentSubject) {
        await monHocService.update(currentSubject.monhoc_id, formData);
      } else {
        await monHocService.create(formData);
      }
      await fetchSubjects(); 
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Lỗi lưu môn học:", error);
      // Với axiosClient, error.response.data chính là body lỗi server trả về
      const msg = error.response?.data?.message || error.message || "Lỗi không xác định";
      alert("Có lỗi xảy ra: " + msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (currentSubject) {
      try {
        await monHocService.delete(currentSubject.monhoc_id);
        await fetchSubjects(); 
        setIsDeleteModalOpen(false);
        setCurrentSubject(null);
      } catch (error) {
        console.error("Lỗi xóa môn học:", error);
        alert("Không thể xóa môn học này.");
      }
    }
  };

  // 🔥 HANDLE IMPORT FILE (ĐÃ FIX LỖI UNDEFINED) 🔥
  const handleImportFile = async (file) => {
    if (!file) return;

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Gọi API Import
      // axiosClient đã bóc tách data, nên biến 'response' chính là object { success: true, message: "..." }
      const response = await monHocService.importExcel(formData);
      
      // Kiểm tra trực tiếp trên response
      if (response && response.success) {
          alert(`✅ ${response.message}`);
          await fetchSubjects(); // Load lại dữ liệu
          setIsImportModalOpen(false); // Đóng modal
      } else {
          // Trường hợp server trả về 200 nhưng success: false (nếu có logic đó)
          // Hoặc cấu trúc response khác dự kiến
          alert(`⚠️ Import thất bại: ${response?.message || "Không rõ nguyên nhân"}`);
      }

    } catch (error) {
      console.error("Lỗi import:", error);
      // Lấy message lỗi từ axios error object
      const errorMsg = error.response?.data?.message || error.message || "Lỗi kết nối server";
      alert(`❌ Lỗi import: ${errorMsg}`);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-6 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto mb-8">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý danh mục Môn học</h1>
                <p className="text-gray-500 mt-1 text-sm">Quản lý các môn học, tín chỉ và thông tin đào tạo.</p>
            </div>
            <SubjectStats totalSubjects={subjects.length} totalCredits={totalCredits} />
        </div>

        {/* CONTENT CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
            
            {/* TOOLBAR */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#3B5998] transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#3B5998] focus:border-[#3B5998] sm:text-sm transition-all"
                        placeholder="Tìm kiếm theo mã hoặc tên môn..."
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

                {/* Buttons Group */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    
                    {/* NÚT IMPORT EXCEL */}
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                    >
                        <Upload size={16} /> <span className="hidden sm:inline">Import Excel</span>
                    </button>

                    <div className="relative">
                      <select
                        value={selectedBoMon}
                        onChange={(e) => setSelectedBoMon(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 text-sm font-medium transition-colors outline-none"
                      >
                        <option value="all">Tất cả Bộ môn</option>
                        {boMonOptions.map((bm) => (
                          <option key={bm.id} value={bm.id}>{bm.name}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                        onClick={handleAddNew}
                        className="flex-1 sm:flex-none px-4 py-2 bg-[#3B5998] hover:bg-[#2e4676] text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Thêm môn học
                    </button>
                </div>
            </div>

            {/* TABLE COMPONENT */}
            <SubjectTable
              subjects={filteredSubjects} 
              isLoading={loading}
              onEdit={handleEdit} 
              onDelete={handleDeleteClick} 
            />

            {/* PAGINATION FOOTER */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                    Hiển thị {filteredSubjects.length} / {subjects.length} kết quả
                </span>
                <div className="flex gap-1">
                    <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50" disabled>
                        &lt;
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#3B5998] bg-[#3B5998] text-white font-medium text-xs">
                        1
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                        &gt;
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* --- MODALS AREA --- */}
      
      {/* 1. Form Modal (Add/Edit) */}
      <SubjectModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveSubject}
        initialData={currentSubject}
      />
      
      {/* 2. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        subjectName={currentSubject?.ten_mon}
      />

      {/* 3. IMPORT EXCEL MODAL */}
      <ImportSubjectModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportFile}
        isLoading={importLoading}
      />
    </div>
  );
}