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
    <div className="min-h-screen bg-[#F0F2F5] text-slate-900 font-sans">
        <main className="max-w-[1400px] mx-auto p-6 md:p-8">
            <nav className="flex mb-6 text-sm text-gray-500 justify-between items-center">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                    {selectedClass && (
                    <li>
                        <div className="flex items-center">
                            <span className="mx-2 text-gray-400">/</span>
                            <span className="text-[#3B5998] font-semibold">{selectedClass.name}</span>
                        </div>
                    </li>
                    )}
                </ol>
            </nav>

            {!selectedClass ? (
                <>
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