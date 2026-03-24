'use strict';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

import { hocKyService } from '@/services/hocKyService';
import { phanCongService } from '@/services/phanCongService';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '../../components/ui/AuthContext';

// Kích hoạt Animation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =================================================================
// 1. TYPE DEFINITIONS & CONSTANTS
// =================================================================

type ScheduleStatus = 'PAST' | 'HAPPENING' | 'FUTURE';

type PhanCong = {
  id: string;
  ngay: string;
  ngay_hoc_raw: string; 
  thu: string;
  tenMon: string;
  tenLop: string;
  thoiGian: string;
  phong: string;
  lophocphan_id: string;
  startDateTime: Date;
  endDateTime: Date;
  trang_thai?: 'scheduled' | 'completed' | 'cancelled';
  is_override?: boolean;
  gv_day_thay?: string | null; 
  giangvien_day_thay_id?: string | null;
  has_substitute?: boolean;
  is_my_substitute_session?: boolean;
  ghi_chu?: string | null;
  loai_de_xuat?: string | null; 
};

type HocKy = { id: string; name: string; };
type WeekOption = { id: number; label: string; detail: string; startDate?: Date; endDate?: Date; };
type SubjectGroup = { tenMon: string; schedules: PhanCong[]; };

const COLORS = {
  primary: '#3B5998',
  background: '#F0F2F5',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#A0A0A0',
  divider: '#E9EBF2',
  success: '#28a745',
  successBg: '#e6f4ea',
  activeWeek: '#F0F7FF',
  warning: '#F57C00',
  substitute: '#9C27B0',
  mySubstitute: '#2E7D32'
};

const TIME_MAP: Record<number, string> = {
  1: "07:00", 2: "07:50", 3: "09:00", 4: "09:50", 5: "10:40",
  7: "13:00", 8: "13:50", 9: "15:00", 10: "15:50", 11: "16:40", 12: "17:30"
};

// =================================================================
// 2. HELPER FUNCTIONS
// =================================================================

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [datePart] = dateStr.split('T'); 
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

const getTimeByTiet = (dateStr: string, tiet: number, isStart: boolean) => {
  const date = parseDateSafe(dateStr);
  const timeStr = TIME_MAP[tiet] || "07:00";
  const [h, m] = timeStr.split(":").map(Number);
  date.setHours(h, m, 0, 0);
  if (!isStart) date.setMinutes(date.getMinutes() + 45);
  return date;
};

const generateWeeks = (startStr: string, endStr: string, startWeekNum: number = 1): WeekOption[] => {
  if (!startStr || !endStr) return [{ id: 0, label: "Tất cả các tuần", detail: "" }];
  const weeks: WeekOption[] = [{ id: 0, label: "Tất cả các tuần", detail: "" }];
  let current = parseDateSafe(startStr);
  current.setHours(0, 0, 0, 0);
  const end = parseDateSafe(endStr);
  end.setHours(23, 59, 59, 999);
  let weekCount = startWeekNum;
  while (current <= end && weekCount <= startWeekNum + 51) {
    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    weeks.push({
      id: weekCount, label: `Tuần ${weekCount}`,
      detail: `(${current.getDate()}/${current.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1})`,
      startDate: new Date(current), endDate: new Date(weekEnd)
    });
    current.setDate(current.getDate() + 7); weekCount++;
  }
  return weeks;
};

// =================================================================
// 3. MAIN COMPONENT
// =================================================================

export default function LichDayChuyenNghiepScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [HOC_KY, setHOC_KY] = useState<HocKy[]>([]);
  const [PHAN_CONG_DATA, setPH_CONG_DATA] = useState<PhanCong[]>([]);
  const [activeSemester, setActiveSemester] = useState<string | undefined>();
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [isWeekModalVisible, setWeekModalVisible] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isFirstLoad = useRef(true);

  // Logic Ghi đè thông tin từ đề xuất
  const applyApprovedProposalOverrides = useCallback((lichData: any[], deXuatData: any[]) => {
    if (!Array.isArray(lichData) || !Array.isArray(deXuatData)) return lichData;
    const approvedMap = new Map<string, any>();
    deXuatData
      .filter((dx: any) => dx?.trang_thai === 'approved' && dx?.buoi_id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .forEach((dx: any) => { if (!approvedMap.has(dx.buoi_id)) approvedMap.set(dx.buoi_id, dx); });

    return lichData.map((item: any) => {
      const dx = approvedMap.get(item.buoi_id);
      if (!dx) return item;
      return {
        ...item,
        ngay_hoc: dx.ngay_moi || item.ngay_hoc,
        tiet_bat_dau: dx.tiet_bat_dau_moi ?? item.tiet_bat_dau,
        so_tiet: dx.so_tiet_moi ?? item.so_tiet,
        phong_hoc: dx.phong_moi || item.phong_hoc,
        is_override: true,
        loai_de_xuat: dx.loai_de_xuat // Lưu lại loại: mo_lai, day_thay, ...
      };
    });
  }, []);

  const fetchMainData = useCallback(async () => {
    if (!activeSemester) return;
    try {
      const [res, dxRes] = await Promise.all([
        phanCongService.getLichGiangDay(activeSemester),
        apiClient('/de-xuat/my-proposals')
      ]);
      if (!res.success) return;
      const rawData = applyApprovedProposalOverrides(res.data, dxRes?.data || []);
      const thuArr = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      
      const mapped = rawData.map((item: any) => {
        const ngayHoc = item.ngay_hoc || item.ngay || new Date().toISOString().split('T')[0];
        const start = getTimeByTiet(ngayHoc, item.tiet_bat_dau, true);
        const end = getTimeByTiet(ngayHoc, item.tiet_bat_dau + item.so_tiet - 1, false);
        const d = parseDateSafe(ngayHoc);
        return {
          id: item.buoi_id, ngay_hoc_raw: ngayHoc, ngay: d.toLocaleDateString('vi-VN'),
          thu: thuArr[d.getDay()], tenMon: item.ten_mon,
          tenLop: item.cac_lop_hanh_chinh ? `Lớp: ${item.cac_lop_hanh_chinh}` : "Lớp:",
          thoiGian: `Tiết ${item.tiet_bat_dau} - ${item.tiet_bat_dau + item.so_tiet - 1}`,
          phong: item.phong_hoc || "Chưa xếp phòng", lophocphan_id: item.lophocphan_id,
          startDateTime: start, endDateTime: end, trang_thai: item.trang_thai || 'scheduled',
          is_override: item.is_override, gv_day_thay: item.gv_day_thay,
          giangvien_day_thay_id: item.giangvien_day_thay_id, has_substitute: !!item.has_substitute,
          is_my_substitute_session: !!item.is_my_substitute_session, ghi_chu: item.ghi_chu,
          loai_de_xuat: item.loai_de_xuat
        };
      });
      setPH_CONG_DATA(mapped.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()));

      if (res.hocKy && isFirstLoad.current) {
        const listWeeks = generateWeeks(res.hocKy.ngay_monday_tuan_1, res.hocKy.ngay_ketthuc, res.hocKy.tuan_bat_dau_co_lich || 1);
        setWeeks(listWeeks);
        const now = new Date();
        const cur = listWeeks.find(w => w.startDate && w.endDate && now >= w.startDate && now <= w.endDate);
        setSelectedWeek(cur || listWeeks[0]);
        isFirstLoad.current = false;
      }
    } catch (e) { console.error(e); }
  }, [activeSemester, applyApprovedProposalOverrides]);

  // Khởi tạo học kỳ theo thời gian thực
  useEffect(() => {
    (async () => {
      const res = await hocKyService.getAllHocKy();
      if (res.success && res.data.length > 0) {
        const now = new Date();
        const filtered = res.data.filter((item: any) => now >= parseDateSafe(item.ngay_monday_tuan_1) && now <= parseDateSafe(item.ngay_ketthuc));
        const final = filtered.length > 0 ? filtered : res.data;
        const mapped = final.map((item: any) => ({ id: item.hocky_id, name: item.ten_hocky }));
        setHOC_KY(mapped); setActiveSemester(mapped[0]?.id);
      }
    })();
  }, []);

  useFocusEffect(useCallback(() => { fetchMainData(); }, [fetchMainData]));
  useEffect(() => { if (activeSemester) { setLoading(true); fetchMainData().finally(() => setLoading(false)); } }, [activeSemester, fetchMainData]);

  const groupedSchedule = useMemo(() => {
    let filtered = PHAN_CONG_DATA;
    if (selectedWeek?.id !== 0 && selectedWeek?.startDate && selectedWeek?.endDate) {
      const s = selectedWeek.startDate.getTime(); const e = selectedWeek.endDate.getTime();
      filtered = PHAN_CONG_DATA.filter(item => item.startDateTime.getTime() >= s && item.startDateTime.getTime() <= e);
    }
    const groups: Record<string, PhanCong[]> = {};
    filtered.forEach(item => { if (!groups[item.tenMon]) groups[item.tenMon] = []; groups[item.tenMon].push(item); });
    return Object.keys(groups).map(key => ({ tenMon: key, schedules: groups[key] }));
  }, [PHAN_CONG_DATA, selectedWeek]);

  const renderScheduleRow = (item: PhanCong) => {
    const now = new Date();
    const isPast = now > item.endDateTime;
    const isNow = now >= item.startDateTime && now <= item.endDateTime;

    // --- PHÂN LOẠI LOGIC NGHIỆP VỤ ---
    const isReopened = item.loai_de_xuat === 'mo_lai' || (item.is_override && item.ghi_chu?.toLowerCase().includes('mở lại'));
    const isCompleted = item.trang_thai === 'completed';
    const isCancelled = item.trang_thai === 'cancelled';
    
    const currentGiangVienId = user?.GiangVien?.giangvien_id;
    const isMySub = item.is_my_substitute_session || (item.giangvien_day_thay_id === currentGiangVienId);
    const blockedByOtherSub = !!item.has_substitute && !isMySub;

    // --- LOGIC KHÓA NÚT (isDisabled) ---
    // 1. Khóa nếu đã bị hủy.
    // 2. Khóa nếu bị giảng viên khác dạy thay.
    // 3. Khóa nếu là buổi quá hạn MÀ không được mở lại VÀ không phải là buổi dạy thay của mình.
    // 4. Khóa nếu đã điểm danh xong MÀ không có lệnh mở lại.
    const isDisabled = isCancelled || 
                       blockedByOtherSub || 
                       (isPast && !isReopened && !isMySub) || 
                       (isCompleted && !isReopened);

    // --- LOGIC HIỂN THỊ LABEL (ƯU TIÊN DẠY THAY HÀNG ĐẦU) ---
    let iconName: any = 'ellipse-outline';
    let iconColor = COLORS.lightGray;
    let statusLabel = '';
    let labelColor = COLORS.text;

    if (isCancelled) {
      iconName = 'close-circle'; iconColor = '#dc3545'; statusLabel = '✕ Đã hủy'; labelColor = '#dc3545';
    } else if (isMySub) {
      iconName = 'swap-horizontal'; iconColor = COLORS.mySubstitute; statusLabel = '↔ Bạn dạy thay'; labelColor = COLORS.mySubstitute;
    } else if (item.gv_day_thay) {
      iconName = 'swap-horizontal'; iconColor = COLORS.substitute; statusLabel = `↔ ${item.gv_day_thay} dạy thay`; labelColor = COLORS.substitute;
    } else if (isCompleted) {
      iconName = 'checkmark-circle'; iconColor = COLORS.success; statusLabel = '✓ Đã điểm danh'; labelColor = COLORS.success;
    } else if (isNow) {
      iconName = 'radio-button-on'; iconColor = COLORS.success; statusLabel = '● Đang dạy'; labelColor = COLORS.success;
    } else if (isReopened) {
      iconName = 'refresh-circle'; iconColor = COLORS.warning; statusLabel = '↺ Được mở lại'; labelColor = COLORS.warning;
    } else if (isPast) {
      iconName = 'ellipse-outline'; iconColor = COLORS.lightGray;
    } else {
      iconName = 'ellipse-outline'; iconColor = COLORS.primary;
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.row, isNow && styles.rowNow, isDisabled && { opacity: 0.5 }]}
        disabled={isDisabled}
        onPress={() => router.push({ pathname: "/chi-tiet-lop", params: { lop_id: item.lophocphan_id, ten_lop: item.tenLop, ngay_hoc: item.ngay_hoc_raw, buoi_id: item.id } })}
      >
        <View style={styles.timeline}>
          <Ionicons name={iconName} size={12} color={iconColor} />
          <View style={[styles.line, isDisabled && { backgroundColor: '#eee' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowHeader}>
            <Text style={[styles.textNgay, (isPast && !isReopened && !isMySub && !isCompleted) && styles.textPast]}>{item.thu}, {item.ngay}</Text>
            {statusLabel !== '' && <Text style={[styles.labelNow, { color: labelColor }]}>{statusLabel}</Text>}
          </View>
          <Text style={[styles.textLop, (isPast && !isReopened && !isMySub && !isCompleted) && styles.textPast]}>{item.tenLop}</Text>
          <View style={styles.info}>
            <Ionicons name="time-outline" size={14} color={COLORS.lightGray} />
            <Text style={styles.infoText}>{item.thoiGian}</Text>
            <Text style={styles.sep}>|</Text>
            <Ionicons name="location-outline" size={14} color={COLORS.lightGray} />
            <Text style={styles.infoText}>{item.phong}</Text>
          </View>
        </View>
        {!isDisabled && <Ionicons name="chevron-forward" size={18} color="#ccc" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.customHeader}>
        <View><Text style={styles.welcomeText}>Xin chào Giảng viên,</Text><Text style={styles.headerTitle}>Lịch Giảng Dạy</Text></View>
        <TouchableOpacity style={styles.notificationBtn}><Ionicons name="notifications-outline" size={24} color={COLORS.text} /><View style={styles.dot} /></TouchableOpacity>
      </View>
      <View style={styles.container}>
        <View style={styles.semesterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {HOC_KY.map(hk => (
              <TouchableOpacity key={hk.id} style={[styles.chip, activeSemester === hk.id && styles.chipActive]} onPress={() => setActiveSemester(hk.id)}>
                <Text style={[styles.chipText, activeSemester === hk.id && { color: '#fff' }]}>{hk.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.weekBtn} onPress={() => setWeekModalVisible(true)}>
          <View style={styles.weekIcon}><Ionicons name="calendar" size={18} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.weekLabel}>Tuần học hiển thị</Text><Text style={styles.weekValue}>{selectedWeek ? `${selectedWeek.label} ${selectedWeek.detail}` : "Đang tải tuần học..."}</Text></View>
          <Ionicons name="chevron-down" size={20} color={COLORS.lightGray} />
        </TouchableOpacity>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : (
          <FlatList
            data={groupedSchedule} keyExtractor={it => it.tenMon}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
                <View style={styles.card}>
                  <TouchableOpacity style={styles.cardHeader} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedSubject(expandedSubject === item.tenMon ? null : item.tenMon); }}>
                    <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.tenMon}</Text><Text style={styles.cardSub}>{item.schedules.length} buổi dạy</Text></View>
                    <Ionicons name={expandedSubject === item.tenMon ? "chevron-up" : "chevron-down"} size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  {expandedSubject === item.tenMon && <View style={styles.cardBody}>{item.schedules.map(renderScheduleRow)}</View>}
                </View>
            )}
            ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="calendar-outline" size={60} color="#ddd" /><Text style={styles.empty}>Không có lịch dạy trong tuần này</Text></View>}
          />
        )}
        <Modal visible={isWeekModalVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setWeekModalVisible(false)}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>Chọn tuần học</Text></View>
              <FlatList data={weeks} keyExtractor={it => it.id.toString()} renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.modalItem, selectedWeek?.id === item.id && { backgroundColor: COLORS.activeWeek }]} onPress={() => { setSelectedWeek(item); setWeekModalVisible(false); }}>
                    <Text style={[styles.modalItemText, selectedWeek?.id === item.id && { color: COLORS.primary, fontWeight: 'bold' }]}>{item.label}</Text>
                    <Text style={styles.modalItemDetail}>{item.detail}</Text>
                    {selectedWeek?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
              )} />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40, paddingBottom: 20, backgroundColor: COLORS.background },
  welcomeText: { fontSize: 13, color: COLORS.lightGray },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  notificationBtn: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  dot: { position: 'absolute', top: 12, right: 12, width: 7, height: 7, backgroundColor: '#FF5252', borderRadius: 4, borderWidth: 1.5, borderColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 16 },
  semesterWrapper: { height: 45, marginBottom: 10, marginTop: 5 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#eee' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#666' },
  weekBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 15, elevation: 1 },
  weekIcon: { width: 32, height: 32, backgroundColor: '#F0F7FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  weekLabel: { fontSize: 10, color: COLORS.lightGray, textTransform: 'uppercase' },
  weekValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2 },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  cardSub: { fontSize: 12, color: COLORS.lightGray },
  cardBody: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  row: { flexDirection: 'row', padding: 15 },
  rowNow: { backgroundColor: COLORS.successBg },
  timeline: { alignItems: 'center', marginRight: 12, width: 16 },
  line: { width: 1.5, flex: 1, backgroundColor: COLORS.primary, marginTop: 4, opacity: 0.2 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  textNgay: { fontSize: 13, color: '#666', fontWeight: '600' },
  textLop: { fontSize: 15, fontWeight: 'bold', marginVertical: 4, color: COLORS.text },
  textPast: { textDecorationLine: 'line-through', color: COLORS.lightGray },
  labelNow: { fontSize: 11, fontWeight: 'bold' },
  info: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 12, color: COLORS.lightGray, marginLeft: 4 },
  sep: { marginHorizontal: 8, color: '#ddd' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  empty: { textAlign: 'center', marginTop: 10, color: COLORS.lightGray, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#eee', borderRadius: 3, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalItem: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', alignItems: 'center', paddingHorizontal: 10 },
  modalItemText: { fontSize: 16, flexShrink: 0, marginRight: 8 },
  modalItemDetail: { fontSize: 14, color: '#888', flex: 1 }
});