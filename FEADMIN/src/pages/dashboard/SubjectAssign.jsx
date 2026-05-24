import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Upload, Building2 } from 'lucide-react'; 
import SubjectTable from '../../components/subjects/SubjectTable';
import SubjectModal from '../../components/subjects/SubjectModal';
import DeleteConfirmModal from '../../components/subjects/DeleteConfirmModal';
import ImportSubjectModal from '../../components/subjects/ImportSubjectModal'; 
import ImportResultModal from '../../components/common/ImportResultModal';
import SubjectStats from '../../components/subjects/SubjectStats';
import monHocService from '../../service/monhocService';
import khoaService from '../../service/khoaService';
import BulkAssignFacultyModal from '../../components/subjects/BulkAssignFacultyModal';
import { toast } from 'react-hot-toast';

export default function SubjectManagerPage() {
  // --- STATE MANAGEMENT ---
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoMon, setSelectedBoMon] = useState('all');
  const [boMonOptions, setBoMonOptions] = useState([]);
  
  // State quản lý Import
  const [importLoading, setImportLoading] = useState(false);
  
  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  const [isImportResultModalOpen, setIsImportResultModalOpen] = useState(false);
  const [importResultSummary, setImportResultSummary] = useState(null);
  const [importSuccessRows, setImportSuccessRows] = useState([]);
  const [importFailedRows, setImportFailedRows] = useState([]);
  
  const [currentSubject, setCurrentSubject] = useState(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const mapDetailErrorsToRows = (details = []) => {
    return details.map((detail) => {
      const text = String(detail || 'Lỗi dữ liệu');
      const matched = text.match(/Dòng\s+(\d+)/i);
      return {
        rowNumber: matched ? Number(matched[1]) : '-',
        label: text,
        reason: text
      };
    });
  };

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

  useEffect(() => {
    const fetchBoMonOptions = async () => {
      try {
        const res = await khoaService.getAllBoMonRaw();
        const list = Array.isArray(res?.data) ? res.data : [];
        const normalized = list
          .filter((item) => item?.bomon_id && (item?.ten_bomon || item?.ma_bomon))
          .map((item) => ({
            id: item.bomon_id,
            name: item.ten_bomon || item.ma_bomon
          }));
        setBoMonOptions(normalized);
      } catch (error) {
        console.error('Lỗi tải danh sách bộ môn cho bộ lọc môn học:', error);
        setBoMonOptions([]);
      }
    };

    fetchBoMonOptions();
  }, []);

  // --- STATS & FILTER ---
  const totalCredits = useMemo(() => subjects.reduce((acc, curr) => acc + (curr.sotinchi || 0), 0), [subjects]);

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

  const handleSaveBulkAssign = async (khoaId, monHocIds) => {
    try {
      const response = await monHocService.bulkAssignKhoa(khoaId, monHocIds);
      const resData = response.data || response;
      if (response.success || resData.success) {
        toast.success(resData.message || "Gán khoa hàng loạt thành công!");
        setSelectedSubjectIds([]);
        await fetchSubjects();
      } else {
        toast.error(resData.message || "Gán khoa thất bại.");
      }
    } catch (error) {
      console.error("Gán khoa hàng loạt thất bại:", error);
      const errorMsg = error.response?.data?.message || error.message || "Lỗi máy chủ khi gán khoa hàng loạt";
      toast.error(errorMsg);
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
          await fetchSubjects(); // Load lại dữ liệu
          setIsImportModalOpen(false); // Đóng modal

          const successCountMatch = String(response.message || '').match(/(\d+)/);
          const successCount = successCountMatch ? Number(successCountMatch[1]) : 0;
          setImportResultSummary({
            totalRows: successCount,
            successCount,
            failedCount: 0
          });
          setImportSuccessRows([
            {
              rowNumber: '-',
              label: 'Import danh sách môn học',
              reason: response.message || 'Import thành công'
            }
          ]);
          setImportFailedRows([]);
          setIsImportResultModalOpen(true);
      } else {
          // Trường hợp server trả về 200 nhưng success: false (nếu có logic đó)
          // Hoặc cấu trúc response khác dự kiến
          const failMessage = response?.message || 'Không rõ nguyên nhân';
          setImportResultSummary({ totalRows: 0, successCount: 0, failedCount: 1 });
          setImportSuccessRows([]);
          setImportFailedRows([
            {
              rowNumber: '-',
              label: 'Import danh sách môn học',
              reason: failMessage
            }
          ]);
          setIsImportResultModalOpen(true);
      }

    } catch (error) {
      console.error("Lỗi import:", error);
      // Lấy message lỗi từ axios error object
      const errorMsg = error.response?.data?.message || error.message || "Lỗi kết nối server";
      const details = error.response?.data?.details;
      if (Array.isArray(details) && details.length) {
        const failedRows = mapDetailErrorsToRows(details);
        setImportResultSummary({
          totalRows: failedRows.length,
          successCount: 0,
          failedCount: failedRows.length
        });
        setImportSuccessRows([]);
        setImportFailedRows(failedRows);
        setIsImportResultModalOpen(true);
      } else {
        setImportResultSummary({ totalRows: 0, successCount: 0, failedCount: 1 });
        setImportSuccessRows([]);
        setImportFailedRows([
          {
            rowNumber: '-',
            label: 'Import danh sách môn học',
            reason: errorMsg
          }
        ]);
        setIsImportResultModalOpen(true);
      }
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 text-slate-900">
      <div className="mb-8">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý danh mục Môn học</h1>
                <p className="text-gray-500 mt-1 text-sm">Quản lý các môn học, tín chỉ và thông tin đào tạo.</p>
            </div>
            <SubjectStats totalSubjects={subjects.length} totalCredits={totalCredits} />
        </div>

        {/* CONTENT CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            
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
                    
                    {/* NÚT GÁN KHOA HÀNG LOẠT */}
                    <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        className="px-3 py-2 bg-blue-50 text-[#3B5998] border border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm cursor-pointer"
                    >
                        <Building2 size={16} /> <span className="hidden sm:inline">Gán khoa hàng loạt</span>
                    </button>

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
              selectedIds={selectedSubjectIds}
              onSelectionChange={setSelectedSubjectIds}
            />
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

      <ImportResultModal
        isOpen={isImportResultModalOpen}
        onClose={() => setIsImportResultModalOpen(false)}
        title="Kết quả import môn học"
        summary={importResultSummary}
        successRows={importSuccessRows}
        failedRows={importFailedRows}
      />

      <BulkAssignFacultyModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSave={handleSaveBulkAssign}
        subjects={subjects}
        initialSelectedIds={selectedSubjectIds}
      />
    </div>
  );
}