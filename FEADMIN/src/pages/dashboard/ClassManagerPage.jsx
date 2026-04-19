import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react'; 
import classService from '../../service/classService';
import ClassListView from '../../components/class/ClassListView';
import ClassDetailView from '../../components/class/ClassDetailView';
import ImportClassModal from '../../components/class/ImportClassModal';

export default function ClassManagerPage() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [classesData, setClassesData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State cho Modal Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await classService.getAll();
      const responseBody = res.data; 
      const listClasses = responseBody && responseBody.data ? responseBody.data : [];

      if (Array.isArray(listClasses)) {
        const formattedData = listClasses.map(item => ({
          id: item.lop_hanhchinh_id,
          name: item.ten_lop,
          // Vẫn map dữ liệu này để dùng cho Filter hoặc xem Detail, nhưng không hiển thị ở Table
          majorName: item.ChuyenNganh?.ten_chuyennganh || "Chưa phân chuyên ngành",
          program: item.chuong_trinh,
          department: item.Khoa?.ten_khoa || 'Chưa cập nhật',
          campus: item.CoSo?.ten_coso || 'Chưa phân cơ sở',
          year: item.nien_khoa?.toString() || '',
          teacher: item.GVCN ? `${item.GVCN.ho} ${item.GVCN.ten}` : 'Chưa phân công',
          count: item.si_so || 0,
          status: 'Active'
        }));
        setClassesData(formattedData);
      } else {
        setClassesData([]);
      }
    } catch (error) {
      console.error("Failed to fetch classes", error);
      setClassesData([]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async (newClassPayload) => {
    try {
        const res = await classService.create(newClassPayload);
        if (res && res.success) {
            alert(res.message); 
            fetchClasses(); 
        } else {
            alert("Có lỗi xảy ra: " + (res.message || "Không rõ lỗi"));
        }
    } catch (error) {
        console.error("Lỗi khi tạo lớp:", error);
        alert("Lỗi kết nối đến server");
    }
  };

  const handleImportClass = async (file) => {
    try {
      const res = await classService.importExcel(file);
      
      if (res && res.success) {
        alert(res.message);
        setIsImportModalOpen(false);
        fetchClasses(); 
      } else {
        alert("Import thất bại: " + (res.message));
      }
    } catch (error) {
      console.error("Import Error:", error);
      const errorResponse = error.response?.data || {};
      const errorMessage = errorResponse.message || "Lỗi server";
      const errorDetails = errorResponse.details || [];
      const customError = new Error(errorMessage);
      customError.details = errorDetails;
      throw customError;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 text-slate-900">
      <main>
            {!selectedClass ? (
                <>
            <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý lớp hành chính</h1>
            <p className="text-sm text-gray-500 mt-1">Danh sách các lớp chính quy và liên thông</p>
            </div>

                  <ClassListView 
                    data={classesData} 
                    onSelect={setSelectedClass}
                    onAddClass={handleCreateClass}
                    onImportClick={() => setIsImportModalOpen(true)}
                  />
                </>
            ) : (
                <ClassDetailView 
                  classInfo={selectedClass} 
                  onBack={() => setSelectedClass(null)} 
                />
            )}
        </main>

        <ImportClassModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportClass}
        />
    </div>
  );
}