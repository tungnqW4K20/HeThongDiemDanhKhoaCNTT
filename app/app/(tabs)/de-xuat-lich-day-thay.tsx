import { apiClient } from "@/services/apiClient";
import { hocKyService } from "@/services/hocKyService";
import { phanCongService } from "@/services/phanCongService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// =================================================================
// CONSTANTS & HELPERS
// =================================================================
const PRIMARY_COLOR = "#3B5998";
const BACKGROUND_COLOR = "#F0F2F5";

const parseDateSafe = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const datePart = dateStr.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

type HocKySimple = { id: string; name: string; };
type ProposalStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function QuanLyDeXuatScreen() {
  const [activeTab, setActiveTab] = useState<"LICH_DAY" | "MO_LAI" | "LICH_SU">("LICH_DAY");
  
  // State lưu duy nhất học kỳ hiện tại
  const [currentSemester, setCurrentSemester] = useState<HocKySimple | null>(null);

  // States lọc lịch sử
  const [statusFilter, setStatusFilter] = useState<ProposalStatus>('all');
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // States dữ liệu
  const [lichDay, setLichDay] = useState<any[]>([]);
  const [lichSuDeXuat, setLichSuDeXuat] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]); // Buổi học đã qua
  const [giangViens, setGiangViens] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Form
  const [isModalVisible, setModalVisible] = useState(false);
  const [isReopenModalVisible, setReopenModalVisible] = useState(false); // Modal mở lại
  const [isGVModalVisible, setGVModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBuoi, setSelectedBuoi] = useState<any>(null);
  const [searchGV, setSearchGV] = useState("");
  const [reopenReason, setReopenReason] = useState(""); // Lý do mở lại
  
  const [formData, setFormData] = useState({
    ngay_moi: "",
    tiet_bat_dau_moi: "",
    so_tiet_moi: "",
    phong_moi: "",
    giangvien_day_thay_moi_id: "",
    ten_giangvien_thay_moi: "Chọn giảng viên dạy thay (nếu có)...",
    ly_do: "",
  });

  // -----------------------------------------------------------------
  // 1. KHỞI TẠO: LẤY HỌC KỲ HIỆN TẠI
  // -----------------------------------------------------------------
  useEffect(() => {
    initSemester();
  }, []);

  const initSemester = async () => {
    try {
      const res = await hocKyService.getAllHocKy();
      if (res.success && res.data.length > 0) {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset to start of day
        
        // Tìm học kỳ mà hôm nay nằm trong khoảng thời gian đó
        const found = res.data.find((item: any) => {
          const start = new Date(item.ngay_batdau); // Sử dụng ngay_batdau thay vì ngay_monday_tuan_1
          const end = new Date(item.ngay_ketthuc);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          
          const isInRange = now >= start && now <= end;
          console.log(`   Checking ${item.ten_hocky}: ${start.toISOString()} - ${end.toISOString()} → ${isInRange}`);
          
          return isInRange;
        });

        // Nếu tìm thấy thì set, nếu không (nghỉ hè) thì lấy học kỳ cuối cùng trong mảng
        const semesterObj = found || res.data[res.data.length - 1];
        
        setCurrentSemester({
          id: semesterObj.hocky_id,
          name: semesterObj.ten_hocky
        });
      }
    } catch (e) { console.error("Lỗi lấy học kỳ:", e); }
  };

  // -----------------------------------------------------------------
  // 2. TẢI DỮ LIỆU CHÍNH (KHI CÓ HỌC KỲ HOẶC ĐỔI TAB)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (currentSemester) loadMainData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemester, activeTab]);

  const loadMainData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        activeTab === "LICH_DAY" ? fetchLichDay() : activeTab === "MO_LAI" ? fetchPastSessions() : fetchLichSu(),
        fetchGiangViens()
      ]);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const [approvedSubstituteBuoiIds, setApprovedSubstituteBuoiIds] = useState<Set<string>>(new Set());

  const fetchLichDay = async () => {
    if (!currentSemester) return;
    const [lichRes, deXuatRes] = await Promise.all([
      phanCongService.getLichGiangDay(currentSemester.id),
      apiClient('/de-xuat/my-proposals')
    ]);
    if (lichRes.success) {
      setLichDay(lichRes.data);

      // Lưu các buoi_id đã có đề xuất dạy thay được duyệt (chinh_sua với GV thay)
      const substitutedIds: Set<string> = new Set();
      if (deXuatRes.success && Array.isArray(deXuatRes.data)) {
        deXuatRes.data.forEach((dx: any) => {
          if (
            dx.loai_de_xuat !== 'mo_lai' &&
            dx.trang_thai === 'approved' &&
            dx.giangvien_day_thay_moi_id
          ) {
            substitutedIds.add(dx.buoi_id);
          }
        });
      }
      setApprovedSubstituteBuoiIds(substitutedIds);
    }
  };

  const fetchPastSessions = async () => {
    if (!currentSemester) return;
    const [lichRes, deXuatRes] = await Promise.all([
      phanCongService.getLichGiangDay(currentSemester.id),
      apiClient('/de-xuat/my-proposals')
    ]);
    if (lichRes.success) {
      const now = new Date();
      const past = lichRes.data.filter((item: any) => parseDateSafe(item.ngay_hoc) < now);

      // Lấy danh sách buoi_id đã có đề xuất mở lại pending/approved
      const existingProposals: Set<string> = new Set();
      if (deXuatRes.success && Array.isArray(deXuatRes.data)) {
        deXuatRes.data.forEach((dx: any) => {
          if (dx.loai_de_xuat === 'mo_lai' && (dx.trang_thai === 'pending' || dx.trang_thai === 'approved')) {
            existingProposals.add(dx.buoi_id);
          }
        });
      }

      // Chỉ hiện buổi chưa có đề xuất mở lại đang pending/approved
      const filtered = past.filter((item: any) => !existingProposals.has(item.buoi_id));
      setPastSessions(filtered);
    }
  };

  const fetchLichSu = async () => {
    const res = await apiClient('/de-xuat/my-proposals'); 
    if (res.success) setLichSuDeXuat(res.data);
  };

  const fetchGiangViens = async () => {
    const res = await apiClient('/giang-vien');
    if (res.errCode === 0) setGiangViens(res.data);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMainData();
    setIsRefreshing(false);
  };

  // -----------------------------------------------------------------
  // 3. LOGIC FILTER & SEARCH
  // -----------------------------------------------------------------
  const upcomingLichDay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lichDay.filter(item =>
      parseDateSafe(item.ngay_hoc) >= today &&
      !approvedSubstituteBuoiIds.has(item.buoi_id)
    );
  }, [lichDay, approvedSubstituteBuoiIds]);

  const filteredLichSu = useMemo(() => {
    return lichSuDeXuat.filter(item => {
      // 1. Lọc theo trạng thái phê duyệt
      if (statusFilter !== 'all' && item.trang_thai !== statusFilter) return false;

      // 2. Lọc theo khoảng ngày
      if (item.ngay_moi) {
        const itemDate = parseDateSafe(item.ngay_moi).getTime();
        if (filterFrom && itemDate < parseDateSafe(filterFrom).getTime()) return false;
        if (filterTo && itemDate > parseDateSafe(filterTo).getTime()) return false;
      }
      return true;
    });
  }, [lichSuDeXuat, statusFilter, filterFrom, filterTo]);

  const filteredGV = useMemo(() => {
    return giangViens.filter(gv => 
      `${gv.ho} ${gv.ten}`.toLowerCase().includes(searchGV.toLowerCase()) ||
      gv.ma_gv.toLowerCase().includes(searchGV.toLowerCase())
    );
  }, [searchGV, giangViens]);

  // -----------------------------------------------------------------
  // 4. HANDLERS
  // -----------------------------------------------------------------
  const handleOpenRequest = (item: any) => {
    setSelectedBuoi(item);
    setFormData({
      ngay_moi: item.ngay_hoc,
      tiet_bat_dau_moi: String(item.tiet_bat_dau),
      so_tiet_moi: String(item.so_tiet),
      phong_moi: item.phong_hoc || "",
      giangvien_day_thay_moi_id: "",
      ten_giangvien_thay_moi: "Chọn giảng viên dạy thay (nếu có)...",
      ly_do: "",
    });
    setModalVisible(true);
  };

  const handleOpenReopenRequest = (item: any) => {
    setSelectedBuoi(item);
    setReopenReason("");
    setReopenModalVisible(true);
  };

  const handleSubmitReopen = async () => {
    if (!reopenReason.trim()) {
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập lý do đề xuất mở lại buổi học.");
    }
    
    setSubmitting(true);
    try {
      const res = await apiClient(`/de-xuat/gui-de-xuat/${selectedBuoi.buoi_id}`, {
        method: 'POST',
        body: {
          loai_de_xuat: 'mo_lai',
          ly_do: reopenReason
        }
      });
      
      if (res.success) {
        Alert.alert("Thành công", "Yêu cầu mở lại buổi học đã được gửi đến admin để phê duyệt.");
        setReopenModalVisible(false);
        setReopenReason("");
        onRefresh();
      } else {
        Alert.alert("Lỗi", res.message || "Gửi thất bại.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể kết nối server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.ly_do) return Alert.alert("Thiếu thông tin", "Vui lòng nhập lý do đề xuất.");
    setSubmitting(true);
    try {
      const res = await apiClient(`/de-xuat/gui-de-xuat/${selectedBuoi.buoi_id}`, {
        method: 'POST',
        body: {
          ngay_moi: formData.ngay_moi,
          tiet_bat_dau_moi: parseInt(formData.tiet_bat_dau_moi),
          so_tiet_moi: parseInt(formData.so_tiet_moi),
          phong_moi: formData.phong_moi,
          giangvien_day_thay_moi_id: formData.giangvien_day_thay_moi_id || null,
          ly_do: formData.ly_do
        }
      });
      if (res.success) {
        Alert.alert("Thành công", "Đề xuất của bạn đã được gửi.");
        setModalVisible(false);
        onRefresh();
      } else { Alert.alert("Lỗi", res.message || "Gửi thất bại."); }
    } catch (error) { 
      console.error(error);
      Alert.alert("Lỗi", "Không thể kết nối server."); 
    } finally { 
      setSubmitting(false); 
    }
  };

  // -----------------------------------------------------------------
  // 5. RENDER COMPONENTS
  // -----------------------------------------------------------------
  const renderScheduleItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.subjectInfo}>
          <Text style={styles.maMonText}>{item.cac_lop_hanh_chinh || "Lớp: N/A"}</Text>
          <Text style={styles.tenMonText}>{item.ten_mon}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: '#E8F0FE' }]}>
          <Text style={[styles.statusText, { color: PRIMARY_COLOR }]}>SẮP TỚI</Text>
        </View>
      </View>
      <View style={styles.cardDetail}>
        <View style={styles.detailRow}><Ionicons name="calendar-outline" size={16} color="#666" /><Text style={styles.detailText}>{item.ngay_hoc}</Text></View>
        <View style={styles.detailRow}><Ionicons name="time-outline" size={16} color="#666" /><Text style={styles.detailText}>Tiết {item.tiet_bat_dau} - {item.tiet_bat_dau + item.so_tiet - 1} | Phòng: <Text style={styles.bold}>{item.phong_hoc || "N/A"}</Text></Text></View>
      </View>
      <TouchableOpacity style={styles.editButton} onPress={() => handleOpenRequest(item)}>
        <Ionicons name="git-pull-request-outline" size={18} color={PRIMARY_COLOR} /><Text style={styles.editButtonText}>Đề xuất chỉnh sửa</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPastSessionItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.subjectInfo}>
          <Text style={styles.maMonText}>{item.cac_lop_hanh_chinh || "Lớp: N/A"}</Text>
          <Text style={styles.tenMonText}>{item.ten_mon}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: '#FFE8E8' }]}>
          <Text style={[styles.statusText, { color: '#D32F2F' }]}>ĐÃ QUA</Text>
        </View>
      </View>
      <View style={styles.cardDetail}>
        <View style={styles.detailRow}><Ionicons name="calendar-outline" size={16} color="#666" /><Text style={styles.detailText}>{item.ngay_hoc}</Text></View>
        <View style={styles.detailRow}><Ionicons name="time-outline" size={16} color="#666" /><Text style={styles.detailText}>Tiết {item.tiet_bat_dau} - {item.tiet_bat_dau + item.so_tiet - 1} | Phòng: <Text style={styles.bold}>{item.phong_hoc || "N/A"}</Text></Text></View>
        {item.trangthai && (
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Trạng thái: <Text style={styles.bold}>{
              item.trangthai === 'completed' ? 'Đã điểm danh' : 
              item.trangthai === 'cancelled' ? 'Đã hủy' : 
              'Chưa điểm danh'
            }</Text></Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={[styles.editButton, { backgroundColor: '#FFF3E0' }]} onPress={() => handleOpenReopenRequest(item)}>
        <Ionicons name="refresh-outline" size={18} color="#F57C00" /><Text style={[styles.editButtonText, { color: '#F57C00' }]}>Đề xuất mở lại</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: any }) => {
    const isApproved = item.trang_thai === 'approved';
    const isRejected = item.trang_thai === 'rejected';
    const isPending = item.trang_thai === 'pending';
    const isReopenRequest = item.loai_de_xuat === 'mo_lai';

    return (
      <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: isApproved ? '#4CAF50' : isRejected ? '#F44336' : PRIMARY_COLOR }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.maMonText}>{item.ma_mon}</Text>
              {isReopenRequest && (
                <View style={[styles.statusBadge, { backgroundColor: '#FFF3E0', marginLeft: 8 }]}>
                  <Text style={[styles.statusText, { color: '#F57C00', fontSize: 9 }]}>MỞ LẠI</Text>
                </View>
              )}
            </View>
            <Text style={styles.tenMonText}>{item.ten_mon}</Text>
            <Text style={styles.historyLopText}>Lớp: {item.ten_lop}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isApproved ? '#E8F5E9' : isRejected ? '#FFEBEE' : '#F3F4F6' }]}>
            <Text style={[styles.statusText, { color: isApproved ? '#2E7D32' : isRejected ? '#C62828' : '#666' }]}>
              {isPending ? 'CHỜ DUYỆT' : isApproved ? 'ĐÃ DUYỆT' : 'TỪ CHỐI'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetail}>
          {isReopenRequest ? (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="information-circle-outline" size={14} color="#555" />
                <Text style={styles.historyInfoText}>
                  <Text style={styles.bold}>Yêu cầu mở lại buổi học</Text>
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={14} color="#555" />
                <Text style={styles.historyInfoText}>Buổi học ngày: <Text style={styles.bold}>{item.ngay_moi || item.BuoiHoc?.ngay || 'N/A'}</Text></Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.detailRow}><Ionicons name="calendar-outline" size={14} color="#555" /><Text style={styles.historyInfoText}>Dạy ngày: <Text style={styles.bold}>{item.ngay_moi}</Text></Text></View>
              <View style={styles.detailRow}><Ionicons name="time-outline" size={14} color="#555" /><Text style={styles.historyInfoText}>Tiết: {item.tiet_bat_dau_moi} | Phòng: {item.phong_moi}</Text></View>
              {!!item.ten_gv_day_thay_moi && (
                <View style={styles.historyGVBox}>
                   <Text style={styles.historyGVLabel}>GIẢNG VIÊN DẠY THAY:</Text>
                   <Text style={styles.historyGVValue}>[{item.ma_gv_day_thay_moi}] {item.ten_gv_day_thay_moi}</Text>
                </View>
              )}
            </>
          )}
          <View style={styles.historyReasonBox}><Text style={styles.historyGVLabel}>LÝ DO:</Text><Text style={styles.historyReasonText}>{item.ly_do}</Text></View>
          {!!item.phan_hoi_admin && (
             <View style={styles.adminFeedbackBox}><Text style={styles.feedbackTitle}>PHẢN HỒI ADMIN:</Text><Text style={styles.feedbackText}>{item.phan_hoi_admin}</Text></View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      
      {/* HEADER TABS */}
      <View style={styles.header}>
        <Text style={styles.title}>Quản Lý Giảng Dạy</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, activeTab === "LICH_DAY" && styles.activeTab]} onPress={() => setActiveTab("LICH_DAY")}>
              <Text style={[styles.tabText, activeTab === "LICH_DAY" && styles.activeTabText]}>Lịch dạy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "MO_LAI" && styles.activeTab]} onPress={() => setActiveTab("MO_LAI")}>
              <Text style={[styles.tabText, activeTab === "MO_LAI" && styles.activeTabText]}>Đề xuất mở lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "LICH_SU" && styles.activeTab]} onPress={() => setActiveTab("LICH_SU")}>
              <Text style={[styles.tabText, activeTab === "LICH_SU" && styles.activeTabText]}>Lịch sử đề xuất</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* HIỂN THỊ HỌC KỲ HIỆN TẠI (CHỈ HIỂN THỊ 1 HỌC KỲ) */}
      <View style={styles.currentSemesterBox}>
        <Ionicons name="school-outline" size={16} color="#FFF" />
        <Text style={styles.currentSemesterText}>
            Học kỳ hiện tại: <Text style={{fontWeight: 'bold'}}>{currentSemester?.name || "Đang xác định..."}</Text>
        </Text>
      </View>

      {/* FILTER TAB LỊCH SỬ (Status + Date) */}
      {activeTab === "LICH_SU" && (
        <View style={{backgroundColor: '#FFF'}}>
          <View style={styles.statusFilterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'pending', label: 'Chờ duyệt' },
                { id: 'approved', label: 'Đã duyệt' },
                { id: 'rejected', label: 'Từ chối' }
              ].map(filter => (
                <TouchableOpacity 
                  key={filter.id} 
                  style={[styles.statusFilterChip, statusFilter === filter.id && styles.statusFilterActive]}
                  onPress={() => setStatusFilter(filter.id as ProposalStatus)}
                >
                  <Text style={[styles.statusFilterText, statusFilter === filter.id && { color: '#FFF' }]}>{filter.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.dateFilterBar}>
            <View style={styles.filterInputGroup}><Ionicons name="calendar-outline" size={14} color={PRIMARY_COLOR} /><TextInput style={styles.filterInput} placeholder="Từ: YYYY-MM-DD" value={filterFrom} onChangeText={setFilterFrom} /></View>
            <View style={styles.filterInputGroup}><Ionicons name="calendar-outline" size={14} color={PRIMARY_COLOR} /><TextInput style={styles.filterInput} placeholder="Đến: YYYY-MM-DD" value={filterTo} onChangeText={setFilterTo} /></View>
            {(!!filterFrom || !!filterTo) && <TouchableOpacity onPress={() => {setFilterFrom(""); setFilterTo("");}}><Ionicons name="close-circle" size={24} color="#999" /></TouchableOpacity>}
          </View>
        </View>
      )}

      {/* DANH SÁCH CHÍNH */}
      {isLoading ? (
        <ActivityIndicator style={{marginTop: 50}} color={PRIMARY_COLOR} size="large" />
      ) : (
        <FlatList
          data={activeTab === "LICH_DAY" ? upcomingLichDay : activeTab === "MO_LAI" ? pastSessions : filteredLichSu}
          renderItem={activeTab === "LICH_DAY" ? renderScheduleItem : activeTab === "MO_LAI" ? renderPastSessionItem : renderHistoryItem}
          keyExtractor={(item, index) => item.dexuat_id || `${item.buoi_id}-${index}`}
          contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{alignItems: 'center', marginTop: 80}}>
              <Ionicons name="file-tray-outline" size={60} color="#DDD" />
              <Text style={{color: '#999', marginTop: 10, fontSize: 14}}>
                {activeTab === "MO_LAI" ? "Không có buổi học nào đã qua" : "Không tìm thấy dữ liệu phù hợp."}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL FORM ĐỀ XUẤT */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đề xuất chỉnh sửa lịch</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color="#CCC" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Ngày dạy mới (YYYY-MM-DD)</Text><TextInput style={styles.input} value={formData.ngay_moi} onChangeText={t => setFormData({...formData, ngay_moi: t})}/></View>
              <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}><Text style={styles.inputLabel}>Tiết bắt đầu</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.tiet_bat_dau_moi} onChangeText={t => setFormData({...formData, tiet_bat_dau_moi: t})}/></View>
                <View style={{flex: 1}}><Text style={styles.inputLabel}>Số tiết</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.so_tiet_moi} onChangeText={t => setFormData({...formData, so_tiet_moi: t})}/></View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Phòng học mới</Text><TextInput style={styles.input} value={formData.phong_moi} onChangeText={t => setFormData({...formData, phong_moi: t})}/></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Giảng viên dạy thay (Nếu có)</Text><TouchableOpacity style={styles.pickerTrigger} onPress={() => setGVModalVisible(true)}><Text numberOfLines={1} style={{color: formData.giangvien_day_thay_moi_id ? '#333' : '#999', flex: 1}}>{formData.ten_giangvien_thay_moi}</Text><Ionicons name="chevron-down" size={20} color="#666" /></TouchableOpacity></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Lý do thay đổi *</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Ghi cụ thể lý do..." value={formData.ly_do} onChangeText={t => setFormData({...formData, ly_do: t})}/></View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFF"/> : <Text style={styles.saveButtonText}>Gửi yêu cầu phê duyệt</Text>}</TouchableOpacity>
              <View style={{height: 50}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL SEARCH GIẢNG VIÊN */}
      <Modal visible={isGVModalVisible} animationType="fade" transparent>
        <View style={styles.gvModalOverlay}>
          <View style={styles.gvModalContent}>
            <View style={styles.searchBar}><Ionicons name="search" size={20} color="#999" /><TextInput placeholder="Tìm tên giảng viên..." style={styles.searchInput} onChangeText={setSearchGV} /></View>
            <FlatList data={filteredGV} keyExtractor={item => item.giangvien_id} renderItem={({item}) => (
              <TouchableOpacity style={styles.gvItem} onPress={() => { setFormData({...formData, giangvien_day_thay_moi_id: item.giangvien_id, ten_giangvien_thay_moi: `${item.ho} ${item.ten}` }); setGVModalVisible(false); }}>
                <Text style={styles.gvName}>{item.ho} {item.ten}</Text><Text style={styles.gvCode}>Mã GV: {item.ma_gv}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.closeGVBtn} onPress={() => setGVModalVisible(false)}><Text style={{color: '#FFF', fontWeight: 'bold'}}>Hủy bỏ</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ĐỀ XUẤT MỞ LẠI BUỔI HỌC */}
      <Modal visible={isReopenModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đề xuất mở lại buổi học</Text>
              <TouchableOpacity onPress={() => setReopenModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#CCC" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedBuoi && (
                <View style={styles.sessionInfoBox}>
                  <Text style={styles.sessionInfoTitle}>Thông tin buổi học:</Text>
                  <View style={styles.sessionInfoRow}>
                    <Ionicons name="book-outline" size={16} color="#666" />
                    <Text style={styles.sessionInfoText}>{selectedBuoi.ten_mon}</Text>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <Ionicons name="people-outline" size={16} color="#666" />
                    <Text style={styles.sessionInfoText}>{selectedBuoi.cac_lop_hanh_chinh}</Text>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.sessionInfoText}>{selectedBuoi.ngay_hoc}</Text>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.sessionInfoText}>
                      Tiết {selectedBuoi.tiet_bat_dau} - {selectedBuoi.tiet_bat_dau + selectedBuoi.so_tiet - 1} | Phòng: {selectedBuoi.phong_hoc || "N/A"}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lý do yêu cầu mở lại *</Text>
                <Text style={styles.inputHint}>
                  Vui lòng giải thích rõ lý do (VD: Quên điểm danh, sự cố kỹ thuật, v.v.)
                </Text>
                <TextInput
                  style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Nhập lý do yêu cầu mở lại buổi học..."
                  value={reopenReason}
                  onChangeText={setReopenReason}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#F57C00' }]} 
                onPress={handleSubmitReopen} 
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF"/>
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#FFF" />
                    <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Gửi yêu cầu phê duyệt</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{height: 50}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: { backgroundColor: PRIMARY_COLOR, paddingBottom: 5 },
  title: { fontSize: 20, fontWeight: "800", color: "#FFF", textAlign: 'center', marginTop: Platform.OS === 'ios' ? 10 : 30, marginBottom: 15 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 10 },
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', marginHorizontal: 4 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#FFF' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13 },
  activeTabText: { color: '#FFF' },

  // Giao diện học kỳ duy nhất
  currentSemesterBox: { backgroundColor: PRIMARY_COLOR, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  currentSemesterText: { color: '#FFF', fontSize: 13, marginLeft: 8 },

  // Status Filter cho tab Lịch sử
  statusFilterBar: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  statusFilterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F0F2F5', marginRight: 8 },
  statusFilterActive: { backgroundColor: PRIMARY_COLOR },
  statusFilterText: { fontSize: 12, color: '#666', fontWeight: '600' },

  dateFilterBar: { flexDirection: 'row', padding: 10, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterInputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 8, paddingHorizontal: 8, flex: 0.45, height: 36 },
  filterInput: { flex: 1, fontSize: 11, marginLeft: 5, color: '#333' },

  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  subjectInfo: { flex: 1, marginRight: 8 },
  maMonText: { fontSize: 12, fontWeight: '700', color: PRIMARY_COLOR },
  tenMonText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardDetail: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { marginLeft: 8, color: '#666', fontSize: 13 },
  bold: { fontWeight: 'bold', color: '#333' },
  historyLopText: { fontSize: 12, color: '#888', marginTop: 2 },
  historyInfoText: { fontSize: 13, color: '#444', marginLeft: 8 },
  historyGVBox: { backgroundColor: '#F0F4FF', padding: 10, borderRadius: 8, marginTop: 10 },
  historyGVLabel: { fontSize: 10, fontWeight: 'bold', color: PRIMARY_COLOR, marginBottom: 2 },
  historyGVValue: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  historyReasonBox: { marginTop: 8, paddingHorizontal: 5 },
  historyReasonText: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  adminFeedbackBox: { marginTop: 10, padding: 10, backgroundColor: '#FFF0F0', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#D32F2F' },
  feedbackTitle: { fontSize: 10, fontWeight: 'bold', color: '#D32F2F', marginBottom: 2 },
  feedbackText: { fontSize: 13, color: '#D32F2F', fontWeight: '600' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4FF', padding: 12, borderRadius: 10, marginTop: 8 },
  editButtonText: { marginLeft: 8, color: PRIMARY_COLOR, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, height: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#DDD', alignSelf: 'center', borderRadius: 2, marginBottom: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: PRIMARY_COLOR },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, fontSize: 15 },
  row: { flexDirection: 'row' },
  pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  saveButton: { backgroundColor: PRIMARY_COLOR, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  gvModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  gvModalContent: { backgroundColor: '#FFF', width: '90%', height: '70%', borderRadius: 15, padding: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
  searchInput: { flex: 1, height: 45, marginLeft: 10 },
  gvItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  gvName: { fontSize: 15, fontWeight: 'bold' },
  gvCode: { fontSize: 12, color: '#888' },
  closeGVBtn: { backgroundColor: '#999', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  
  // Styles cho modal đề xuất mở lại
  sessionInfoBox: { 
    backgroundColor: '#F0F4FF', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR
  },
  sessionInfoTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: PRIMARY_COLOR, 
    marginBottom: 12 
  },
  sessionInfoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  sessionInfoText: { 
    fontSize: 13, 
    color: '#333', 
    marginLeft: 8,
    flex: 1
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontStyle: 'italic'
  }
});