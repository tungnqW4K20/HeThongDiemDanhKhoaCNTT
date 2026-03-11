import { useAuth } from "@/components/ui/AuthContext";
import { submitAttendance } from "@/services/diemdanhService";
import { lopHocPhanService } from "@/services/lopHocPhanService";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as XLSX from "xlsx";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SinhVien {
  ma_sv: string;
  ho: string;
  ten: string;
  email: string;
  sdt?: string;
  sinhvien_id: string
}

type AttendanceStatus = 'present' | 'excused' | 'unexcused';

interface SinhVienWithAttendance extends SinhVien {
  attendanceStatus: AttendanceStatus;
  note: string;
}

// --- STUDENT CARD COMPONENT ---
const StudentCard = React.memo(({ student, onUpdateAttendance }: { 
  student: SinhVienWithAttendance, 
  onUpdateAttendance: (ma_sv: string, newStatus: AttendanceStatus, newNote: string) => void 
}) => {
  const [isNoteVisible, setNoteVisible] = useState(false);
  const [note, setNote] = useState(student.note || "");

  useEffect(() => {
    setNote(student.note || "");
  }, [student.note]);
  
  const handleStatusChange = () => {
    let newStatus: AttendanceStatus = 'present';
    if (student.attendanceStatus === 'present') {
      newStatus = 'unexcused';
    } else if (student.attendanceStatus === 'unexcused') {
      newStatus = 'excused';
    } else {
      newStatus = 'present';
    }

    if (newStatus === 'present') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNoteVisible(false);
      setNote("");
      onUpdateAttendance(student.ma_sv, newStatus, "");
    } else {
      onUpdateAttendance(student.ma_sv, newStatus, note);
    }
  };

  const handleNoteBlur = () => {
    onUpdateAttendance(student.ma_sv, student.attendanceStatus, note);
  };
  
  const toggleNoteInput = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNoteVisible(!isNoteVisible);
  };

  const renderStatusPill = () => {
    const isExcused = student.attendanceStatus === 'excused';
    const isUnexcused = student.attendanceStatus === 'unexcused';

    let pillStyle = styles.pillPresent;
    let textStyle = styles.pillTextPresent;
    let text = "Có mặt";

    if (isExcused) {
      pillStyle = styles.pillExcused;
      textStyle = styles.pillTextExcused;
      text = "Vắng CP";
    } else if (isUnexcused) {
      pillStyle = styles.pillUnexcused;
      textStyle = styles.pillTextUnexcused;
      text = "Vắng KP";
    }

    return (
      <TouchableOpacity onPress={handleStatusChange} style={[styles.statusPill, pillStyle]}>
        <Text style={[styles.pillText, textStyle]}>{text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.cardWrapper}>
        <View style={styles.card}>
            <View style={styles.cardIcon}>
                <Ionicons name="person-circle-outline" size={36} color="#4A90E2" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{`${student.ho} ${student.ten}`}</Text>
                <Text style={styles.cardSubtitle}>MSSV: {student.ma_sv}</Text>
            </View>
            <View style={styles.attendanceSection}>
                {renderStatusPill()}
                {student.attendanceStatus !== 'present' && (
                    <TouchableOpacity onPress={toggleNoteInput} style={styles.noteIcon}>
                        <Ionicons name={isNoteVisible || student.note ? "document-text" : "document-text-outline"} size={22} color="#8A8A8E" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
        {isNoteVisible && student.attendanceStatus !== 'present' && (
            <View style={styles.noteContainer}>
                <TextInput
                    style={styles.noteInput}
                    placeholder="Thêm ghi chú..."
                    placeholderTextColor="#999"
                    value={note}
                    onChangeText={setNote}
                    onBlur={handleNoteBlur}
                    autoFocus={true}
                />
            </View>
        )}
    </View>
  );
});

StudentCard.displayName = 'StudentCard';

// --- MAIN SCREEN COMPONENT ---
export default function ChiTietLop() {
  const { lop_id, ten_lop, lop_hanhchinh_id, ngay_hoc, buoi_id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<SinhVienWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (lop_id) {
      const fetchStudents = async () => {
        try {
          // Dùng ngay_hoc từ params nếu có (buổi mở lại), ngược lại dùng hôm nay
          const targetDate = (ngay_hoc && typeof ngay_hoc === 'string') ? ngay_hoc : new Date().toISOString().split("T")[0];
          const json = await lopHocPhanService.getSinhVienByLopHocPhan(lop_id as string, targetDate);

          if (json.success) {
            const studentsWithDefaultAttendance = json.data.map((sv: any) => {
              const record = sv.DanhSachDiemDanh?.[0];
              let status: AttendanceStatus = "present";
              if (record) {
                if (record.trangthai === "absent") status = "unexcused";
                else if (record.trangthai === "excused") status = "excused";
              }
              return {
                ma_sv: sv.ma_sv || "",
                ho: sv.ho || "",
                ten: sv.ten || "",
                email: sv.email || "",
                sdt: sv.sdt ?? "",
                sinhvien_id: sv.sinhvien_id,
                attendanceStatus: status,
                note: record?.ghichu || ""
              };
            });
            setStudents(studentsWithDefaultAttendance);
          }
        } catch (err) {
          console.error("❌ Lỗi lấy danh sách sinh viên:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [lop_id]);

  // --- SỬA LỖI TÌM KIẾM TẠI ĐÂY ---
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;

    return students.filter((sv) => {
      const fullName = `${sv.ho} ${sv.ten}`.toLowerCase();
      const maSV = (sv.ma_sv || "").toLowerCase();
      const email = (sv.email || "").toLowerCase();
      
      return (
        fullName.includes(query) ||
        maSV.includes(query) ||
        email.includes(query)
      );
    });
  }, [students, searchQuery]);

  const handleUpdateAttendance = (ma_sv: string, newStatus: AttendanceStatus, newNote: string) => {
    setStudents(currentStudents =>
      currentStudents.map(student =>
        student.ma_sv === ma_sv
          ? { ...student, attendanceStatus: newStatus, note: newNote }
          : student
      )
    );
  };

  const handleExportExcel = async () => {
    try {
      if (students.length === 0) {
        Alert.alert("Thông báo", "Không có dữ liệu để xuất.");
        return;
      }

      const data = [
        ["BẢNG ĐIỂM DANH SINH VIÊN"],
        [""],
        ["Lớp hành chính:", lop_hanhchinh_id || ""],
        ["Môn học:", ten_lop || ""],
        ["Ngày xuất:", new Date().toLocaleString()],
        [""],
        ["STT", "Mã SV", "Họ", "Tên", "Trạng thái", "Ghi chú"],
      ];

      students.forEach((sv, index) => {
        let status = "Có mặt";
        if (sv.attendanceStatus === "unexcused") status = "Vắng không phép";
        if (sv.attendanceStatus === "excused") status = "Vắng có phép";
        data.push([String(index + 1), sv.ma_sv, sv.ho, sv.ten, status, sv.note || ""]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
      ws["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 35 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DiemDanh");
      const fileName = `diem_danh_${Date.now()}.xlsx`;

      if (Platform.OS === "web") {
        const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        const blob = await (await fetch(`data:application/octet-stream;base64,${wbout}`)).blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        return;
      }

      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileUri = (FileSystem as any).cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: "base64" });
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Xuất Excel",
      });
    } catch {
      Alert.alert("Lỗi", "Không thể xuất file Excel.");
    }
  };

  const handleConfirmAttendance = async () => {
    const presentCount = students.filter(s => s.attendanceStatus === 'present').length;
    const absentCount = students.length - presentCount;
    const confirmMessage = `Xác nhận điểm danh?\n\n• Có mặt: ${presentCount}\n• Vắng: ${absentCount}`;

    const executeSubmit = async () => {
      setSubmitting(true);
      try {
        const danhSachAPI = students.map(student => {
          let statusDB = 'present';
          if (student.attendanceStatus === 'unexcused') statusDB = 'absent';
          if (student.attendanceStatus === 'excused') statusDB = 'excused'; 
          return {
            sinhvien_id: student.sinhvien_id,
            trangthai: statusDB,
            ghichu: student.note
          };
        });
        // Dùng ngay_hoc từ params nếu có (buổi mở lại), ngược lại dùng hôm nay
        const today = (ngay_hoc && typeof ngay_hoc === 'string') ? ngay_hoc : new Date().toISOString().split('T')[0];
        
        if (!user?.taikhoan_id) {
          Alert.alert("Lỗi", "Không tìm thấy thông tin tài khoản.");
          return;
        }

        const payload = {
          lophocphan_id: Array.isArray(lop_id) ? lop_id[0] : lop_id,
          ngay: today,
          nguoi_tao: user.taikhoan_id,
          danh_sach: danhSachAPI
        };

        const result = await submitAttendance(payload);
        console.log("result", result)
        if (result.success) {
          if (Platform.OS === 'web') {
            window.alert("Thành công: Đã lưu điểm danh!");
          } else {
            Alert.alert("Thành công", "Đã lưu điểm danh!", [
              {
                text: "OK",
                onPress: () => {
                  router.back(); // Navigate back, useFocusEffect sẽ reload dữ liệu
                }
              }
            ]);
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert("Thất bại: " + result.message);
          } else {
            Alert.alert("Thất bại", result.message);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSubmitting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) await executeSubmit();
    } else {
      Alert.alert("Xác nhận Điểm danh", confirmMessage, [
        { text: "Hủy bỏ", style: "cancel" },
        { text: "Xác nhận", onPress: executeSubmit } 
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Điểm danh sinh viên</Text>
        <Text style={styles.subtitle}>
          {lop_hanhchinh_id ? `${lop_hanhchinh_id}` : `${ten_lop}`}
        </Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportExcel}>
          <Ionicons name="document-text-outline" size={20} color="#28A745" />
          <Text style={styles.exportBtnText}>Xuất Excel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm sinh viên..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={({ item }) => (
          <StudentCard 
            student={item} 
            onUpdateAttendance={handleUpdateAttendance} 
          />
        )}
        keyExtractor={(item) => `sv-${item.sinhvien_id}-${item.ma_sv}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {students.length === 0
                ? "Lớp này chưa có sinh viên."
                : "Không tìm thấy sinh viên phù hợp."}
            </Text>
          </View>
        }
      />
      
      <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.confirmButton, submitting && { opacity: 0.7 }]} 
            onPress={handleConfirmAttendance}
            disabled={submitting}
          >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Xác nhận Điểm danh</Text>
              )}
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: "bold", color: "#1C1C1E" },
  subtitle: { fontSize: 16, color: "#8A8A8E", marginTop: 4 },
  exportBtn: {
    marginTop: 10, alignSelf: "flex-start", backgroundColor: "#E8F5E9",
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  exportBtnText: { color: "#28A745", fontWeight: "600" },
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 12, marginHorizontal: 20, marginVertical: 15,
    paddingHorizontal: 15, borderWidth: 1, borderColor: '#E8E8E8'
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: "#333" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: "#8A8A8E" },
  cardWrapper: { marginBottom: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#E8E8E8',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
  },
  cardIcon: { marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#2C2C2E" },
  cardSubtitle: { fontSize: 14, color: "#8A8A8E", marginTop: 3 },
  attendanceSection: { flexDirection: 'row', alignItems: 'center' },
  noteIcon: { padding: 5, marginLeft: 8 },
  statusPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 13, fontWeight: 'bold' },
  pillPresent: { backgroundColor: 'rgba(40, 167, 69, 0.1)' },
  pillTextPresent: { color: '#28A745' },
  pillExcused: { backgroundColor: 'rgba(255, 193, 7, 0.1)' },
  pillTextExcused: { color: '#FFC107' },
  pillUnexcused: { backgroundColor: 'rgba(220, 53, 69, 0.1)' },
  pillTextUnexcused: { color: '#DC3545' },
  noteContainer: { backgroundColor: '#F0F2F5', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 10, marginTop: -10, paddingTop: 15 },
  noteInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#E8E8E8' },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: '#F7F8FA', borderTopWidth: 1, borderTopColor: '#E8E8E8' },
  confirmButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});