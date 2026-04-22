import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

// Services
import ClassListView from '../../components/partclass/ClassListView';
import ClassDetailView from '../../components/partclass/ClassDetailView';
import hocPhanService from '../../service/lophocphanService';
import hocKyService from '../../service/hockyService';
import khoaService from '../../service/khoaService';

// Components

const parseDateOnlyLocal = (dateValue) => {
  if (!dateValue) return null;
  const normalized = String(dateValue).slice(0, 10);
  const [y, m, d] = normalized.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

const pickDefaultSemesterIdByTime = (semesterList = []) => {
  if (!Array.isArray(semesterList) || semesterList.length === 0) return '';

  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const currentSemester = semesterList.find((sem) => {
    const start = parseDateOnlyLocal(sem.ngay_batdau);
    const end = parseDateOnlyLocal(sem.ngay_ketthuc);
    return start && end && now >= start && now <= end;
  });
  if (currentSemester?.hocky_id) return currentSemester.hocky_id;

  const sortedByStartDesc = [...semesterList].sort((a, b) => {
    const aStart = parseDateOnlyLocal(a.ngay_batdau)?.getTime() || 0;
    const bStart = parseDateOnlyLocal(b.ngay_batdau)?.getTime() || 0;
    return bStart - aStart;
  });

  const nearestPastSemester = sortedByStartDesc.find((sem) => {
    const start = parseDateOnlyLocal(sem.ngay_batdau);
    return start && start <= now;
  });

  return nearestPastSemester?.hocky_id || sortedByStartDesc[0]?.hocky_id || '';
};

const parseWeekList = (rawWeeks) => {
  if (Array.isArray(rawWeeks)) {
    return rawWeeks
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  if (typeof rawWeeks === 'string') {
    const text = rawWeeks.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0);
      }
    } catch {
      const list = text
        .replace(/\[|\]/g, '')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);
      return list;
    }
  }

  return [];
};


const PartClassManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [classList, setClassList] = useState([]);
  const [boMonOptions, setBoMonOptions] = useState([]);
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
          setSelectedSemester(pickDefaultSemesterIdByTime(res.data));
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
          maLop: String(item.ma_lop || '').trim(),
          tietBatDau: item.tiet_bat_dau ?? '',
          soTiet: item.so_tiet ?? '',
          tuanHoc: parseWeekList(item.tuan_hoc),
          loaiHocPhan: item.loai_hoc_phan || 'LT',
          
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
          adminClassOptions: item.DanhSachLopHanhChinh?.map((lop) => ({
            id: lop.lop_hanhchinh_id,
            name: lop.ten_lop
          })) || [],
          
          semesterName: item.HocKy?.ten_hocky,
          isPractical: item.ten_lophocphan.includes('*'), // Tự động nhận diện thực hành qua dấu *
          
          dayOfWeek: item.thu || 'TBD',
          room: item.phong || 'P.000',
        }));
        setClassList(mapped);
      }
    } catch (err) { console.error("Lỗi lớp học phần:", err); }
    finally { setIsLoading(false); }
  }, [selectedSemester]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

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
        console.error('Lỗi tải bộ lọc bộ môn cho lớp học phần:', error);
        setBoMonOptions([]);
      }
    };

    fetchBoMonOptions();
  }, []);

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
            boMonOptions={boMonOptions}
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