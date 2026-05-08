import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';

import ClassManagerPage from './pages/dashboard/ClassManagerPage';
import SubjectManagerPage from './pages/dashboard/SubjectAssign';
import LecturerManagerPage from './pages/dashboard/LecturerManager';
import AssignmentPage from './pages/dashboard/ScheduleAssign';
import AttendancePagegggg from './pages/dashboard/Attendance';
import RetakeClassPage from './pages/dashboard/ReregisterCourse';
import SemesterManagerPage from './pages/dashboard/SemesterManager';
import KhoaManager from './pages/dashboard/KhoaManager';
import BoMonManagerPage from './pages/dashboard/BoMonManager';
import ChuyenNganhManagerPage from './pages/dashboard/ChuyenNganhManager';
import PartClassManagerPage from './pages/dashboard/PartClassManagerPage';
import AttendanceStats from './pages/dashboard/AttendanceStats';
import CoSoManagerPage from './pages/dashboard/CoSoManager';
import ChangePasswordPage from './pages/dashboard/ChangePasswordPage';
import TaiKhoanManager from './pages/dashboard/TaiKhoanManager';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<AttendanceStats />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              <Route element={<ProtectedRoute allowedRoles={['admin', 'lanhdao', 'truongbomon']} />}>
                <Route path="/classes" element={<ClassManagerPage />} />
                <Route path="/lecturers" element={<LecturerManagerPage />} />
                <Route path="/subjects" element={<SubjectManagerPage />} />
                <Route path="/schedule" element={<AssignmentPage />} />
                <Route path="/attendance" element={<AttendancePagegggg />} />
                <Route path="/reregiter-course" element={<RetakeClassPage />} />
                <Route path="/semester" element={<SemesterManagerPage />} />
                <Route path="/department" element={<KhoaManager />} />
                <Route path="/part-class" element={<PartClassManagerPage />} />

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/bo-mon" element={<BoMonManagerPage />} />
                  <Route path="/chuyen-nganh" element={<ChuyenNganhManagerPage />} />
                  <Route path="/co-so" element={<CoSoManagerPage />} />
                  <Route path="/users" element={<TaiKhoanManager />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
