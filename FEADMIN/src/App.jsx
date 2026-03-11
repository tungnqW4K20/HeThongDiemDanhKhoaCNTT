import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';

import Overview from './pages/dashboard/Overview';
import ClassManagerPage from './pages/dashboard/ClassManagerPage';
import SubjectManagerPage from './pages/dashboard/SubjectAssign';
import LecturerManagerPage from './pages/dashboard/LecturerManager';
import DeleteConfirmModalSchedule from './components/assign/DeleteConfirmModal';
import AssignmentPage from './pages/dashboard/ScheduleAssign';
import AttendancePage from './pages/dashboard/Attendance';
import AttendancePagegggg from './pages/dashboard/Attendance';
import CourseRegistration from './pages/dashboard/ReregisterCourse';
import RetakeClassPage from './pages/dashboard/ReregisterCourse';
import SemesterManagerPage from './pages/dashboard/SemesterManager';
import KhoaManager from './pages/dashboard/KhoaManager';
import PartClassManagerPage from './pages/dashboard/PartClassManagerPage';

const StudentManager = () => <div>Đăng ký học phần Content</div>;
const LecturerManager = () => <div>Quản lý Giảng Viên Content</div>;
const SubjectAssign = () => <div>Phân công Môn Content</div>;
const ScheduleAssign = () => <div>Phân công Lịch dạy Content</div>;
const Attendance = () => <div>Kiểm soát Điểm danh Content</div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Route Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Route Protected — tất cả đã đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AdminLayout />}>
              {/* Dashboard: Admin + Lãnh đạo đều xem được */}
              <Route index element={<Overview />} />

              {/* Các trang chỉ dành cho Admin */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/classes" element={<ClassManagerPage />} />
                <Route path="/lecturers" element={<LecturerManagerPage />} />
                <Route path="/subjects" element={<SubjectManagerPage />} />
                <Route path="/schedule" element={<AssignmentPage />} />
                <Route path="/attendance" element={<AttendancePagegggg />} />
                <Route path="/reregiter-course" element={<RetakeClassPage />} />
                <Route path="/semester" element={<SemesterManagerPage />} />
                <Route path="/department" element={<KhoaManager />} />
                <Route path="/part-class" element={<PartClassManagerPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch all - Redirect về home nếu link sai */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;