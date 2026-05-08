import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react'; 
import classService from '../../service/classService';
import cosoService from '../../service/cosoService';
import khoaService from '../../service/khoaService';
import { useAuth } from '../../hooks/useAuth';
import ClassListView from '../../components/class/ClassListView';
import ClassDetailView from '../../components/class/ClassDetailView';
import ImportClassModal from '../../components/class/ImportClassModal';

export default function ClassManagerPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState(null);
  const [classesData, setClassesData] = useState([]);
  const [campusOptions, setCampusOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [majorOptions, setMajorOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State cho Modal Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (user?.vaitro === 'lanhdao' && user?.khoa_id) {
        params.khoa_id = user.khoa_id;
      }
      const res = await classService.getAll(params);
      const responseBody = res.data; 
      const listClasses = responseBody && responseBody.data ? responseBody.data : [];

      if (Array.isArray(listClasses)) {
        const formattedData = listClasses.map(item => ({
          id: item.lop_hanhchinh_id,
          name: item.ten_lop,
          khoa_id: item.khoa_id || '',
          chuyennganh_id: item.chuyennganh_id || '',
          coso_id: item.coso_id || '',
          giangvien_id: item.giangvien_id || '',
          ghichu: item.ghichu || '',
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
    fetchFilterOptions();
  }, [user]);

  const fetchFilterOptions = async () => {
    try {
      const [coSoRes, khoaRes, chuyenNganhRes] = await Promise.all([
        cosoService.getAll(),
        khoaService.getAll(),
        khoaService.getAllChuyenNganh()
      ]);

      const coSoList = coSoRes?.data?.data || coSoRes?.data || [];
      const khoaList = khoaRes?.data?.data || khoaRes?.data || [];
      const chuyenNganhList = chuyenNganhRes?.data?.data || chuyenNganhRes?.data || [];

      setCampusOptions(
        Array.isArray(coSoList)
          ? coSoList.map((item) => item.ten_coso).filter(Boolean)
          : []
      );

      let kList = Array.isArray(khoaList) ? khoaList : [];
      if (user?.vaitro === 'lanhdao' && user?.khoa_id) {
        kList = kList.filter(k => k.khoa_id === user.khoa_id);
      }

      setDepartmentOptions(
        kList.map((item) => item.ten_khoa).filter(Boolean)
      );

      setMajorOptions(
        Array.isArray(chuyenNganhList)
          ? chuyenNganhList
              .filter((item) => item?.ten_chuyennganh)
              .map((item) => ({
                name: item.ten_chuyennganh,
                department: item.Khoa?.ten_khoa || ''
              }))
          : []
      );
    } catch (error) {
      console.error('Failed to fetch class filter options', error);
      setCampusOptions([]);
      setDepartmentOptions([]);
      setMajorOptions([]);
    }
  };

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
                    campusOptions={campusOptions}
                    departmentOptions={departmentOptions}
                    majorOptions={majorOptions}
                    canEdit={user?.vaitro !== 'lanhdao'}
                    onSelect={setSelectedClass}
                    onAddClass={handleCreateClass}
                    onImportClick={() => setIsImportModalOpen(true)}
                  />
                </>
            ) : (
                <ClassDetailView 
                  classInfo={selectedClass} 
                  canEdit={user?.vaitro !== 'lanhdao'}
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