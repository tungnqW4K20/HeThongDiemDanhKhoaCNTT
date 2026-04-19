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
          departmentId: item.MonHoc?.BoMon?.bomon_id || item.MonHoc?.chuyennganh_id || item.MonHoc?.bomon_id || null,
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
    <div className="animate-in fade-in duration-500">
      {viewMode === 'list' ? (
        <>
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#3B5998]">Quản lý lớp học phần</h1>
              <p className="text-sm text-gray-500 mt-1">Danh sách lớp học phần theo học kỳ, giảng viên và bộ môn</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-white px-3 py-2.5 rounded-xl shadow-sm border border-gray-200">
                <div className="bg-[#3B5998] p-2 rounded-lg text-white">
                  <Calendar size={18} />
                </div>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-transparent font-semibold text-gray-700 outline-none pr-6 cursor-pointer text-sm"
                >
                  {semesters.map((s) => (
                    <option key={s.hocky_id} value={s.hocky_id}>{s.ten_hocky}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchClasses}
                className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                title="Làm mới dữ liệu"
              >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <ClassListView
            data={classList}
            isLoading={isLoading}
            onSelect={(cls) => { setSelectedClass(cls); setViewMode('detail'); }}
            onImportClick={() => alert("Tính năng Import Excel")}
          />
        </>
      ) : (
        <ClassDetailView
          classInfo={selectedClass}
          onBack={() => setViewMode('list')}
        />
      )}
    </div>
  );
};
export default PartClassManagement;