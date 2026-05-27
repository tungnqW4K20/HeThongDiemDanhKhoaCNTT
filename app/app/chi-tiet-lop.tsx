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
  Modal,
  ScrollView,
} from "react-native";
import * as XLSX from "xlsx";

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- INTERFACES ---
interface DiemDanhSummary {
  vắng_kp: number;
  vắng_cp: number;
  tong_vắng: number;
  tong_buoi: number;
  tile_nghi: string;
  canh_bao: boolean;
}

interface HistoryRecord {
  ngay: string;
  trangthai: 'present' | 'absent' | 'excused';
  ghichu: string | null;
}

interface SinhVien {
  ma_sv: string;
  ten: string; 
  email: string | null;
  sinhvien_id: string;
  Lop?: { ten_lop: string }; // Thông tin lớp hành chính
  DiemDanhSummary?: DiemDanhSummary;
  FullHistory?: HistoryRecord[];
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

  const summary = student.DiemDanhSummary;
  const isWarning = summary?.canh_bao;

  const getHealthColor = () => {
    const rate = parseFloat(summary?.tile_nghi || "0");
    if (rate >= 20) return "#EF4444"; 
    if (rate >= 10) return "#F59E0B"; 
    return "#10B981"; 
  };

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

  return (
    <View style={styles.cardWrapper}>
        <View style={[styles.card, isWarning && styles.cardWarningBorder]}>
            <View style={styles.cardIconContainer}>
                <Ionicons name="person-circle-outline" size={42} color="#94A3B8" />
                {isWarning && <View style={styles.statusDot} />}
            </View>
            <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{student.ten}</Text>
                    {isWarning && (
                        <View style={styles.miniWarningTag}>
                            <Text style={styles.miniWarningText}>{summary.tile_nghi}%</Text>
                        </View>
                    )}
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.cardSubtitle}>MSSV: {student.ma_sv}</Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.summaryText}>
                        Nghỉ: <Text style={{ color: getHealthColor(), fontWeight: '700' }}>{summary?.tong_vắng ?? summary?.tong_vang ?? 0}/{summary?.tong_buoi || 0}</Text>
                    </Text>
                </View>
                <View style={styles.healthBarContainer}>
                    <View style={[styles.healthBarFill, { 
                        width: `${Math.max(5, 100 - parseFloat(summary?.tile_nghi || "0"))}%`, 
                        backgroundColor: getHealthColor() 
                    }]} />
                </View>
            </View>
            <View style={styles.attendanceSection}>
                <TouchableOpacity onPress={handleStatusChange} style={[styles.statusPill, 
                    student.attendanceStatus === 'present' ? styles.pillPresent : 
                    (student.attendanceStatus === 'excused' ? styles.pillExcused : styles.pillUnexcused)]}>
                    <Text style={[styles.pillText, 
                        student.attendanceStatus === 'present' ? styles.pillTextPresent : 
                        (student.attendanceStatus === 'excused' ? styles.pillTextExcused : styles.pillTextUnexcused)]}>
                        {student.attendanceStatus === 'present' ? "Có mặt" : (student.attendanceStatus === 'excused' ? "Vắng CP" : "Vắng KP")}
                    </Text>
                </TouchableOpacity>
                {student.attendanceStatus !== 'present' && (
                    <TouchableOpacity onPress={toggleNoteInput} style={styles.noteIcon}>
                        <Ionicons name={isNoteVisible || student.note ? "chatbubble-ellipses" : "chatbubble-outline"} size={22} color="#8A8A8E" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
        {isNoteVisible && student.attendanceStatus !== 'present' && (
            <View style={styles.noteContainer}>
                <TextInput
                    style={styles.noteInput}
                    placeholder="Thêm ghi chú lý do vắng..."
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
  const { lop_id, ten_lop, lop_hanhchinh_id, ngay_hoc, giang_vien } = useLocalSearchParams();
  const { user } = useAuth(); 
  const router = useRouter();
  
  const [students, setStudents] = useState<SinhVienWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Lấy dữ liệu từ API
  useEffect(() => {
    if (lop_id) {
      const fetchStudents = async () => {
        try {
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
                ...sv,
                attendanceStatus: status,
                note: record?.ghichu || ""
              };
            });
            setStudents(studentsWithDefaultAttendance);
          }
        } catch (err) {
          console.error("❌ Lỗi tải dữ liệu:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [lop_id]);

  // Logic lấy danh sách các lớp hành chính tham gia
  const administrativeClasses = useMemo(() => {
    const classes = new Set<string>();
    students.forEach(sv => {
      if (sv.Lop?.ten_lop) {
        classes.add(sv.Lop.ten_lop);
      }
    });
    const result = Array.from(classes).sort().join(", ");
    return result || (lop_hanhchinh_id as string) || "N/A";
  }, [students, lop_hanhchinh_id]);

  const allHistoryDates = useMemo(() => {
    if (students.length === 0) return [];
    const datesSet = new Set<string>();
    students.forEach(sv => sv.FullHistory?.forEach(h => datesSet.add(h.ngay)));
    return Array.from(datesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [students]);

  const lecturerName = useMemo(() => {
    if (!user) return "N/A";
    const ho = user.ho || user.GiangVien?.ho || "";
    const ten = user.ten || user.GiangVien?.ten || "";
    return `${ho} ${ten}`.trim() || user.username || "Giảng viên";
  }, [user]);

  const displayedLecturer = useMemo(() => {
    if (typeof giang_vien === 'string' && giang_vien.trim()) return giang_vien;
    return lecturerName;
  }, [giang_vien, lecturerName]);

  const displayedDate = useMemo(() => {
    const rawDate = (typeof ngay_hoc === 'string' && ngay_hoc) ? ngay_hoc : new Date().toISOString().split('T')[0];
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return rawDate;
    return parsed.toLocaleDateString('vi-VN');
  }, [ngay_hoc]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((sv) => sv.ten.toLowerCase().includes(query) || sv.ma_sv.toLowerCase().includes(query));
  }, [students, searchQuery]);

  const handleUpdateAttendance = (ma_sv: string, newStatus: AttendanceStatus, newNote: string) => {
    setStudents(curr => curr.map(s => s.ma_sv === ma_sv ? { ...s, attendanceStatus: newStatus, note: newNote } : s));
  };

  const saveAndShareExcel = async (wb: XLSX.WorkBook, fileName: string) => {
    try {
      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        const fs = FileSystem as any;
        const directory = fs.cacheDirectory || fs.documentDirectory;
        const fileUri = `${directory}${fileName}_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: "base64" });
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không thể xuất file Excel.");
    }
  };

  // 1. Xuất Excel bảng tổng hợp chi tiết
  const handleExportSummaryExcel = async () => {
    try {
        if (students.length === 0) return;

        const headerRow: any[] = ["STT", "Mã SV", "Họ Tên", "Lớp HC"];
        const dateHeaders = allHistoryDates.map(d => d.split('-').reverse().slice(0, 2).join('/'));
        headerRow.push(...dateHeaders, "Vắng KP", "Vắng CP", "Tỉ lệ (%)");

        const data: any[][] = [
            ["BẢNG TỔNG HỢP CHI TIẾT ĐIỂM DANH"],
            [`Lớp học phần: ${ten_lop || 'N/A'}`],
            [`Giảng viên: ${lecturerName}`],
            [`Lớp tham gia: ${administrativeClasses}`],
            [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
            [],
            headerRow
        ];

        students.forEach((sv, i) => {
            const row: any[] = [i + 1, sv.ma_sv, sv.ten, sv.Lop?.ten_lop || ""];
            allHistoryDates.forEach(date => {
                const h = sv.FullHistory?.find(x => x.ngay === date);
                if (!h) row.push("-");
                else if (h.trangthai === 'present') row.push("x");
                else if (h.trangthai === 'absent') row.push("V");
                else if (h.trangthai === 'late') row.push("M");
                else if (h.trangthai === 'excused') row.push("P");
                else if (h.trangthai === 'not_recorded') row.push("Chưa điểm danh");
                else row.push("-");
            });
            row.push(
                sv.DiemDanhSummary?.vắng_kp ?? sv.DiemDanhSummary?.vang_kp ?? 0, 
                sv.DiemDanhSummary?.vắng_cp ?? sv.DiemDanhSummary?.vang_cp ?? 0, 
                (sv.DiemDanhSummary?.tile_nghi || "0") + "%"
            );
            data.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "TongHop");
        await saveAndShareExcel(wb, `TongHop_${ten_lop}`);
    } catch (e) { Alert.alert("Lỗi", "Lỗi xuất file tổng hợp."); }
  };

  // 2. Xuất Excel danh sách hiện tại
  const handleExportCurrentExcel = async () => {
    try {
      if (students.length === 0) return;
      const data: any[][] = [
        ["DANH SÁCH ĐIỂM DANH BUỔI HỌC"],
        [`Lớp học phần: ${ten_lop || 'N/A'}`],
        [`Giảng viên: ${lecturerName}`],
        [`Lớp tham gia: ${administrativeClasses}`],
        [`Ngày học: ${ngay_hoc || new Date().toLocaleDateString('vi-VN')}`],
        [],
        ["STT", "Mã SV", "Họ Tên", "Lớp HC", "Trạng thái", "Ghi chú"]
      ];

      students.forEach((sv, i) => {
        let st = "Có mặt";
        if(sv.attendanceStatus === 'unexcused') st = "Vắng không phép";
        else if(sv.attendanceStatus === 'excused') st = "Vắng có phép";
        data.push([i+1, sv.ma_sv, sv.ten, sv.Lop?.ten_lop || "", st, sv.note || ""]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BuoiHoc");
      await saveAndShareExcel(wb, `DiemDanh_${ngay_hoc}`);
    } catch (e) { Alert.alert("Lỗi", "Lỗi xuất file điểm danh."); }
  };

  const handleConfirmAttendance = async () => {
    const presentCount = students.filter(s => s.attendanceStatus === 'present').length;
    const confirmMessage = `Xác nhận điểm danh cho ${students.length} sinh viên?\n\n• Có mặt: ${presentCount}\n• Vắng: ${students.length - presentCount}`;

    const executeSubmit = async () => {
      setSubmitting(true);
      try {
        const danhSachAPI = students.map(student => ({
            sinhvien_id: student.sinhvien_id,
            trangthai: student.attendanceStatus === 'unexcused' ? 'absent' : (student.attendanceStatus === 'excused' ? 'excused' : 'present'),
            ghichu: student.note
        }));
        const today = (ngay_hoc && typeof ngay_hoc === 'string') ? ngay_hoc : new Date().toISOString().split('T')[0];
        const payload = {
          lophocphan_id: Array.isArray(lop_id) ? lop_id[0] : lop_id,
          ngay: today,
          nguoi_tao: user?.taikhoan_id,
          danh_sach: danhSachAPI
        };

        const result = await submitAttendance(payload);
        if (result.success) {
            if (Platform.OS === 'web') { window.alert("Thành công!"); router.back(); }
            else { Alert.alert("Thành công", "Đã lưu!", [{ text: "OK", onPress: () => router.back() }]); }
        }
      } catch (e) { Alert.alert("Lỗi", "Không thể kết nối máy chủ."); } finally { setSubmitting(false); }
    };

    if (Platform.OS === 'web') { if (window.confirm(confirmMessage)) await executeSubmit(); }
    else { Alert.alert("Xác nhận", confirmMessage, [{ text: "Hủy", style: "cancel" }, { text: "Xác nhận", onPress: executeSubmit }]); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4A90E2" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
            <Text style={styles.title}>Điểm danh</Text>
            <Text style={styles.subtitle}>{ten_lop}</Text>
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color="#475569" />
              <Text style={styles.metaLabel}>Giảng viên:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{displayedLecturer}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#475569" />
              <Text style={styles.metaLabel}>Ngày học:</Text>
              <Text style={styles.metaValue}>{displayedDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={14} color="#475569" />
              <Text style={styles.metaLabel}>Lớp HC:</Text>
              <Text style={styles.metaValueMulti}>{administrativeClasses}</Text>
            </View>
          </View>
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportCurrentExcel}>
                    <Ionicons name="document-text-outline" size={18} color="#28A745" />
                    <Text style={styles.exportBtnText}>Xuất Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryModalVisible(true)}>
                    <Ionicons name="grid-outline" size={18} color="#007AFF" />
                    <Text style={styles.historyBtnText}>Bảng tổng hợp</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Tìm MSSV hoặc tên..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <FlatList
            data={filteredStudents}
            renderItem={({ item }) => <StudentCard student={item} onUpdateAttendance={handleUpdateAttendance} />}
            keyExtractor={(item) => `sv-${item.sinhvien_id}`}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
        />
      </View>
      
      <View style={styles.footer}>
          <TouchableOpacity style={[styles.confirmButton, submitting && { opacity: 0.7 }]} onPress={handleConfirmAttendance} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmButtonText}>Xác nhận Điểm danh</Text>}
          </TouchableOpacity>
      </View>

      <Modal visible={historyModalVisible} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}><Ionicons name="chevron-down" size={28} color="#333" /></TouchableOpacity>
                <Text style={styles.modalTitle}>Quá trình học tập</Text>
                <TouchableOpacity onPress={handleExportSummaryExcel} style={styles.modalExportBtn}><Ionicons name="download-outline" size={22} color="#28A745" /></TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    <View style={styles.tableHeaderRow}>
                        <View style={styles.stickyHeaderCell}><Text style={styles.headerText}>Sinh viên</Text></View>
                        {allHistoryDates.map(d => (
                            <View key={d} style={styles.dateHeaderCell}><Text style={styles.dateHeaderText}>{d.split('-').reverse().slice(0,2).join('/')}</Text></View>
                        ))}
                    </View>
                    <FlatList
                        data={students}
                        keyExtractor={s => s.sinhvien_id}
                        renderItem={({item}) => (
                            <View style={styles.tableBodyRow}>
                                <View style={styles.stickyBodyCell}><Text style={styles.tableNameText} numberOfLines={1}>{item.ten}</Text></View>
                                {allHistoryDates.map(d => {
                                    const h = item.FullHistory?.find(x => x.ngay === d);
                                    let ic = <Ionicons name="ellipse-outline" size={12} color="#CBD5E1" />;
                                    if(h?.trangthai === 'present') ic = <Ionicons name="checkmark-circle" size={18} color="#10B981" />;
                                    else if(h?.trangthai === 'absent') ic = <Ionicons name="close-circle" size={18} color="#EF4444" />;
                                    else if(h?.trangthai === 'excused') ic = <Ionicons name="remove-circle" size={18} color="#F59E0B" />;
                                    return <View key={d} style={styles.dataCell}>{ic}</View>;
                                })}
                            </View>
                        )}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10 },
  title: { fontSize: 32, fontWeight: "bold", color: "#1C1C1E" },
  subtitle: { fontSize: 16, color: "#8A8A8E", marginTop: 4 },
  metaCard: { marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaLabel: { marginLeft: 6, fontSize: 12, color: '#64748B', fontWeight: '600' },
  metaValue: { marginLeft: 6, flex: 1, fontSize: 12, color: '#0F172A', fontWeight: '600' },
  metaValueMulti: { marginLeft: 6, flex: 1, fontSize: 12, color: '#0F172A', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  exportBtn: { backgroundColor: "#E8F5E9", padding: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: '#A7F3D0' },
  exportBtnText: { color: "#28A745", fontWeight: "600", fontSize: 13 },
  historyBtn: { backgroundColor: "#EFF6FF", padding: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  historyBtnText: { color: "#007AFF", fontWeight: "600", fontSize: 13 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, marginHorizontal: 20, marginVertical: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E8E8E8' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 46, fontSize: 16 },
  cardWrapper: { marginBottom: 12, marginHorizontal: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardWarningBorder: { borderColor: "#FEE2E2", backgroundColor: "#FFFBFA" },
  cardIconContainer: { position: 'relative' },
  statusDot: { position: 'absolute', right: 0, top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
  cardContent: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  miniWarningTag: { backgroundColor: "#FEF2F2", paddingHorizontal: 5, borderRadius: 4, marginLeft: 6, borderWidth: 0.5, borderColor: "#FECACA" },
  miniWarningText: { color: "#DC2626", fontSize: 9, fontWeight: "800" },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardSubtitle: { fontSize: 12, color: "#64748B" },
  dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1", marginHorizontal: 6 },
  summaryText: { fontSize: 12, color: "#64748B" },
  healthBarContainer: { width: '80%', height: 3, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 2 },
  attendanceSection: { flexDirection: 'row', alignItems: 'center' },
  noteIcon: { padding: 4, marginLeft: 8 },
  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  pillText: { fontSize: 12, fontWeight: '800' },
  pillPresent: { backgroundColor: '#F0FDF4' }, pillTextPresent: { color: '#16A34A' },
  pillExcused: { backgroundColor: '#FFFBEB' }, pillTextExcused: { color: '#D97706' },
  pillUnexcused: { backgroundColor: '#FEF2F2' }, pillTextUnexcused: { color: '#DC2626' },
  noteContainer: { backgroundColor: '#F8FAFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 10, marginTop: -12, paddingTop: 20, zIndex: -1, borderWidth: 1, borderColor: '#E2E8F0' },
  noteInput: { backgroundColor: '#FFF', borderRadius: 8, padding: 8, fontSize: 13, borderWidth: 1, borderColor: '#DDD' },
  footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  confirmButton: { backgroundColor: '#007AFF', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalExportBtn: { padding: 8, backgroundColor: '#E8F5E9', borderRadius: 8 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC' },
  stickyHeaderCell: { width: 100, padding: 12, borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  dateHeaderCell: { width: 50, padding: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  headerText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  dateHeaderText: { fontSize: 10, fontWeight: '700' },
  tableBodyRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stickyBodyCell: { width: 100, padding: 12, backgroundColor: '#FFF', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  tableNameText: { fontSize: 12, fontWeight: '600' },
  dataCell: { width: 50, height: 44, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
});