import { useAuth } from "@/components/ui/AuthContext";
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
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
} from "react-native";
import * as XLSX from "xlsx";

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
  Lop?: { ten_lop: string };
  DiemDanhSummary?: DiemDanhSummary;
  FullHistory?: HistoryRecord[];
}

// --- STUDENT CARD COMPONENT (READ ONLY) ---
const StudentCardReadOnly = React.memo(({ student }: { student: SinhVien }) => {
  const summary = student.DiemDanhSummary;
  const rate = parseFloat(summary?.tile_nghi || "0");
  const isWarning = summary?.canh_bao;

  const getHealthColor = () => {
    if (rate >= 20) return "#EF4444"; // Nguy hiểm
    if (rate >= 10) return "#F59E0B"; // Cảnh báo
    return "#10B981"; // An toàn
  };

  const getStatusLabel = () => {
    if (rate >= 20) return { text: "Nguy hiểm", bg: "#FEF2F2", color: "#DC2626" };
    if (rate >= 10) return { text: "Cảnh báo", bg: "#FFFBEB", color: "#D97706" };
    return { text: "An toàn", bg: "#F0FDF4", color: "#16A34A" };
  };

  const status = getStatusLabel();

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
                            <Text style={styles.miniWarningText}>{summary?.tile_nghi}%</Text>
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
                        width: `${Math.max(5, 100 - rate)}%`, 
                        backgroundColor: getHealthColor() 
                    }]} />
                </View>
            </View>
            <View style={styles.attendanceSection}>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                    <Text style={[styles.pillText, { color: status.color }]}>{status.text}</Text>
                </View>
            </View>
        </View>
    </View>
  );
});

StudentCardReadOnly.displayName = 'StudentCardReadOnly';

// --- MAIN SCREEN COMPONENT ---
export default function ChiTietDiemDanh() {
  const { lop_id, ten_lop, lop_hanhchinh_id, giang_vien } = useLocalSearchParams();
  const { user } = useAuth(); 
  
  const [students, setStudents] = useState<SinhVien[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Lấy dữ liệu từ API
  useEffect(() => {
    if (lop_id) {
      const fetchStudents = async () => {
        try {
          // Lấy ngày hôm nay để API trả về đầy đủ tổng hợp tính đến hiện tại
          const targetDate = new Date().toISOString().split("T")[0];
          const json = await lopHocPhanService.getSinhVienByLopHocPhan(lop_id as string, targetDate);

          if (json.success) {
            setStudents(json.data);
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

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((sv) => sv.ten.toLowerCase().includes(query) || sv.ma_sv.toLowerCase().includes(query));
  }, [students, searchQuery]);

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

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4A90E2" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
            <Text style={styles.title}>Quá trình học tập</Text>
            <Text style={styles.subtitle}>{ten_lop}</Text>
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color="#475569" />
              <Text style={styles.metaLabel}>Giảng viên:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{displayedLecturer}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={14} color="#475569" />
              <Text style={styles.metaLabel}>Lớp HC:</Text>
              <Text style={styles.metaValueMulti}>{administrativeClasses}</Text>
            </View>
          </View>
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryModalVisible(true)}>
                    <Ionicons name="grid-outline" size={18} color="#007AFF" />
                    <Text style={styles.historyBtnText}>Xem Ma Trận Điểm Danh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportSummaryExcel}>
                    <Ionicons name="download-outline" size={18} color="#28A745" />
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Tìm MSSV hoặc tên..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <FlatList
            data={filteredStudents}
            renderItem={({ item }) => <StudentCardReadOnly student={item} />}
            keyExtractor={(item) => `sv-${item.sinhvien_id}`}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
        />
      </View>

      <Modal visible={historyModalVisible} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}><Ionicons name="chevron-down" size={28} color="#333" /></TouchableOpacity>
                <Text style={styles.modalTitle}>Ma trận Điểm danh</Text>
                <TouchableOpacity onPress={handleExportSummaryExcel} style={styles.modalExportBtn}><Ionicons name="download-outline" size={22} color="#28A745" /></TouchableOpacity>
            </View>

            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.legendText}>Có mặt</Text>
                </View>
                <View style={styles.legendItem}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.legendText}>Vắng</Text>
                </View>
                <View style={styles.legendItem}>
                    <Ionicons name="time" size={14} color="#F59E0B" />
                    <Text style={styles.legendText}>Muộn</Text>
                </View>
                <View style={styles.legendItem}>
                    <Ionicons name="remove-circle" size={14} color="#3B82F6" />
                    <Text style={styles.legendText}>Phép</Text>
                </View>
                <View style={styles.legendItem}>
                    <Ionicons name="ellipse-outline" size={11} color="#CBD5E1" />
                    <Text style={styles.legendText}>Chưa ĐD</Text>
                </View>
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
                                    else if(h?.trangthai === 'late') ic = <Ionicons name="time" size={18} color="#F59E0B" />;
                                    else if(h?.trangthai === 'excused') ic = <Ionicons name="remove-circle" size={18} color="#3B82F6" />;
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
  exportBtn: { backgroundColor: "#E8F5E9", padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: '#A7F3D0' },
  historyBtn: { flex: 1, backgroundColor: "#EFF6FF", padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  historyBtnText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, marginHorizontal: 20, marginVertical: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E8E8E8' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 46, fontSize: 16 },
  cardWrapper: { marginBottom: 12 },
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
  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  pillText: { fontSize: 12, fontWeight: '800' },
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
  legendContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 10
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  legendText: { 
    fontSize: 11, 
    color: '#64748B', 
    fontWeight: '600',
    marginLeft: 4
  },
});
