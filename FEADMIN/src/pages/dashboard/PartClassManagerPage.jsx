import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

// Services
import ClassListView from '../../components/partclass/ClassListView';
import ClassDetailView from '../../components/partclass/ClassDetailView';
import hocPhanService from '../../service/lophocphanService';
import hocKyService from '../../service/hockyService';

// Components


const PartClassManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [classList, setClassList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list | detail
  const [selectedClass, setSelectedClass] = useState(null);
  console.log("--------------------")
  // 1. Lấy danh sách học kỳ
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await hocKyService.getAll();
        if (res.success && res.data.length > 0) {
          setSemesters(res.data);
          setSelectedSemester(res.data[0].hocky_id);
        }
      } catch (err) { console.error("Lỗi học kỳ:", err); }
    };
    initData();
  }, []);

  // 2. Lấy danh sách lớp học phần theo học kỳ
  const fetchClasses = useCallback(async () => {
    if (!selectedSemester) return;
    setIsLoading(true);
    try {
      const res = await hocPhanService.getAll({ hocky_id: selectedSemester });
      if (res.success) {
        // MAPPING DỮ LIỆU TỪ API JSON
        const mapped = res.data.map(item => ({
          id: item.lophocphan_id,
          className: item.ten_lophocphan,
          
          // Môn học
          subjectName: item.MonHoc?.ten_mon || 'Không rõ môn',
          subjectCode: item.MonHoc?.ma_mon || 'N/A',
          
          // Giảng viên (Họ + Tên)
          teacherName: `${item.GiangVien?.ho || ''} ${item.GiangVien?.ten || ''}`.trim(),
          teacherPhone: item.GiangVien?.sdt || 'Chưa cập nhật',

          // Khoa / Bộ môn của môn học
          facultyName: item.MonHoc?.Khoa?.ten_khoa || '',
          departmentName: item.MonHoc?.BoMon?.ten_bomon || '',
          
          // Lớp hành chính (Mảng tên các lớp)
          adminClasses: item.DanhSachLopHanhChinh?.map(lop => lop.ten_lop) || [],
          
          semesterName: item.HocKy?.ten_hocky,
          isPractical: item.ten_lophocphan.includes('*'), // Tự động nhận diện thực hành qua dấu *
          
          // Mock lịch học (vì API hiện tại chưa trả về)
          dayOfWeek: 'TBD',
          room: 'P.000',
        }));
        setClassList(mapped);
      }
    } catch (err) { console.error("Lỗi lớp học phần:", err); }
    finally { setIsLoading(false); }
  }, [selectedSemester]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Toolbar */}
        {viewMode === 'list' && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-[#3B5998] p-2 rounded-xl text-white shadow-md shadow-blue-200">
                <Calendar size={20} />
              </div>
              <select 
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent font-bold text-gray-700 outline-none pr-8 cursor-pointer text-sm"
              >
                {semesters.map(s => (
                  <option key={s.hocky_id} value={s.hocky_id}>{s.ten_hocky}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={fetchClasses}
              className="p-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-[#3B5998] transition-all shadow-sm"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        )}

        {/* Nội dung chính */}
        {viewMode === 'list' ? (
          <ClassListView 
            data={classList} 
            isLoading={isLoading}
            onSelect={(cls) => { setSelectedClass(cls); setViewMode('detail'); }}
            onImportClick={() => alert("Tính năng Import Excel")}
          />
        ) : (
          <ClassDetailView 
            classInfo={selectedClass} 
            onBack={() => setViewMode('list')} 
          />
        )}

      </div>
    </div>
  );
};
export default PartClassManagement;