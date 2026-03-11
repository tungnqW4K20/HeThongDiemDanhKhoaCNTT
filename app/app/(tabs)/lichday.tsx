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
  ngay_hoc_raw: string; // YYYY-MM-DD gốc từ API
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
  gv_day_thay?: string | null; // Tên GV dạy thay (nếu có)
};

type HocKy = { id: string; name: string; };

type WeekOption = {
  id: number;
  label: string;
  detail: string;
  startDate?: Date;
  endDate?: Date;
};

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
  activeWeek: '#F0F7FF'
};

const TIME_MAP: Record<number, string> = {
  1: "07:00", 2: "07:50", 3: "09:00", 4: "09:50", 5: "10:40",
  7: "13:00", 8: "13:50", 9: "15:00", 10: "15:50", 11: "16:40", 12: "17:30"
};

// =================================================================
// 2. HELPER FUNCTIONS
// =================================================================

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) {
    return new Date();
  }
  
  // React Native safe date parsing
  // Handle YYYY-MM-DD format (ISO date)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [datePart] = dateStr.split('T'); // Handle both "2026-01-19" and "2026-01-19T..."
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const isValid = !isNaN(date.getTime());
    return isValid ? date : new Date();
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  const isValid = !isNaN(date.getTime());
  return isValid ? date : new Date();
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

  if (isNaN(current.getTime()) || isNaN(end.getTime())) return weeks;

  let weekCount = startWeekNum;
  while (current <= end && weekCount <= startWeekNum + 51) {
    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    weeks.push({
      id: weekCount,
      label: `Tuần ${weekCount}`,
      detail: `(${current.getDate()}/${current.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1})`,
      startDate: new Date(current),
      endDate: new Date(weekEnd)
    });
    current.setDate(current.getDate() + 7);
    weekCount++;
  }
  return weeks;
};

// =================================================================
// 3. MAIN COMPONENT
// =================================================================

export default function LichDayChuyenNghiepScreen() {
  const router = useRouter();
  
  const [HOC_KY, setHOC_KY] = useState<HocKy[]>([]);
  const [PHAN_CONG_DATA, setPH_CONG_DATA] = useState<PhanCong[]>([]);
  const [activeSemester, setActiveSemester] = useState<string | undefined>();
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [isWeekModalVisible, setWeekModalVisible] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isFirstLoad = useRef(true);

  // Khởi tạo Học Kỳ theo thời gian hiện tại
  useEffect(() => {
    (async () => {
      try {
        const res = await hocKyService.getAllHocKy();
        if (res.success && res.data.length > 0) {
          const now = new Date();
          
          // Lọc học kỳ: Chỉ lấy những học kỳ mà thời gian hiện tại nằm trong khoảng bắt đầu và kết thúc
          const filteredData = res.data.filter((item: any) => {
            const startDate = parseDateSafe(item.ngay_monday_tuan_1);
            const endDate = parseDateSafe(item.ngay_ketthuc);
            // Để linh hoạt hơn, ta có thể cho phép hiển thị nếu hôm nay nằm trong khoảng này
            return now >= startDate && now <= endDate;
          });

          // Nếu đang trong kỳ nghỉ (không có HK nào khớp), ta lấy HK mới nhất hoặc tất cả
          const finalData = filteredData.length > 0 ? filteredData : res.data;

          const mapped = finalData.map((item: any) => ({
            id: item.hocky_id, name: item.ten_hocky
          }));
          
          setHOC_KY(mapped);
          setActiveSemester(mapped[0]?.id);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Reload chỉ phần lịch dạy khi màn hình được focus lại (sau khi điểm danh)
  useFocusEffect(
    useCallback(() => {
      // Bỏ qua lần đầu tiên - useEffect([activeSemester]) sẽ xử lý initial load
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      if (!activeSemester) return;
      (async () => {
        try {
          const res = await phanCongService.getLichGiangDay(activeSemester);
          if (!res.success || !Array.isArray(res.data)) return;
          const thuArr = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
          const mapped: PhanCong[] = res.data.map((item: any) => {
            const ngayHoc = item.ngay_hoc || item.ngay || new Date().toISOString().split('T')[0];
            const start = getTimeByTiet(ngayHoc, item.tiet_bat_dau, true);
            const end = getTimeByTiet(ngayHoc, item.tiet_bat_dau + item.so_tiet - 1, false);
            const ngayDate = parseDateSafe(ngayHoc);
            return {
              id: item.buoi_id,
              ngay_hoc_raw: ngayHoc,
              ngay: ngayDate.toLocaleDateString('vi-VN'),
              thu: thuArr[ngayDate.getDay()],
              tenMon: item.ten_mon,
              tenLop: item.cac_lop_hanh_chinh ? `Lớp: ${item.cac_lop_hanh_chinh}` : "Lớp:",
              thoiGian: `Tiết ${item.tiet_bat_dau} - ${item.tiet_bat_dau + item.so_tiet - 1}`,
              phong: item.phong_hoc || "Chưa xếp phòng",
              lophocphan_id: item.lophocphan_id,
              startDateTime: start,
              endDateTime: end,
              trang_thai: item.trang_thai || 'scheduled',
            is_override: item.is_override || false,
            gv_day_thay: item.gv_day_thay || null
            };
          });
          setPH_CONG_DATA(mapped.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()));
        } catch (e) { /* silent */ }
      })();
    }, [activeSemester])
  );

  // Lấy dữ liệu lịch dạy
  useEffect(() => {
    if (!activeSemester) return;
    (async () => {
      setLoading(true);
      setExpandedSubject(null);
      try {
        const res = await phanCongService.getLichGiangDay(activeSemester);
        // Chỉ clear data nếu server trả về lỗi thực sự (not network/abort errors)
        if (!res.success || !Array.isArray(res.data)) {
          if (res.message !== 'Lỗi kết nối máy chủ') setPH_CONG_DATA([]);
          return;
        }

        const thuArr = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const mapped: PhanCong[] = res.data.map((item: any) => {
          const ngayHoc = item.ngay_hoc || item.ngay || new Date().toISOString().split('T')[0];
          const start = getTimeByTiet(ngayHoc, item.tiet_bat_dau, true);
          const end = getTimeByTiet(ngayHoc, item.tiet_bat_dau + item.so_tiet - 1, false);
          const ngayDate = parseDateSafe(ngayHoc);
          
          return {
            id: item.buoi_id,
            ngay_hoc_raw: ngayHoc,
            ngay: ngayDate.toLocaleDateString('vi-VN'),
            thu: thuArr[ngayDate.getDay()],
            tenMon: item.ten_mon,
            tenLop: item.cac_lop_hanh_chinh ? `Lớp: ${item.cac_lop_hanh_chinh}` : "Lớp:",
            thoiGian: `Tiết ${item.tiet_bat_dau} - ${item.tiet_bat_dau + item.so_tiet - 1}`,
            phong: item.phong_hoc || "Chưa xếp phòng",
            lophocphan_id: item.lophocphan_id,
            startDateTime: start,
            endDateTime: end,
            trang_thai: item.trang_thai || 'scheduled', // Lấy trạng thái từ API
            is_override: item.is_override || false
          };
        });

        setPH_CONG_DATA(mapped.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()));

        if (res.hocKy && res.hocKy.ngay_monday_tuan_1 && res.hocKy.ngay_ketthuc) {
          const tuanBatDau = res.hocKy.tuan_bat_dau_co_lich || 1;
          const listWeeks = generateWeeks(res.hocKy.ngay_monday_tuan_1, res.hocKy.ngay_ketthuc, tuanBatDau);
          setWeeks(listWeeks);
          
          const now = new Date();
          const current = listWeeks.find(w => {
            if (!w.startDate || !w.endDate) return false;
            return now >= w.startDate && now <= w.endDate;
          });
          
          setSelectedWeek(current || listWeeks[0]);
        } else {
          console.warn('Missing hocKy data in response');
          setWeeks([{ id: 0, label: "Tất cả các tuần", detail: "" }]);
          setSelectedWeek({ id: 0, label: "Tất cả các tuần", detail: "" });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [activeSemester]);

  // Logic Filter & Group
  const groupedSchedule = useMemo<SubjectGroup[]>(() => {
    console.log('Filtering schedule - Total items:', PHAN_CONG_DATA.length);
    console.log('Selected week:', selectedWeek?.id, selectedWeek?.label);
    
    let filtered = PHAN_CONG_DATA;
    if (selectedWeek?.id !== 0 && selectedWeek?.startDate && selectedWeek?.endDate) {
      const s = selectedWeek.startDate.getTime();
      const e = selectedWeek.endDate.getTime();
      console.log('Filtering by week range:', new Date(s).toISOString(), 'to', new Date(e).toISOString());
      
      filtered = PHAN_CONG_DATA.filter(item => {
        const time = item.startDateTime.getTime();
        const inRange = time >= s && time <= e;
        if (inRange) {
          console.log('  ✓ Included:', item.tenMon, item.ngay);
        }
        return inRange;
      });
      console.log('Filtered count:', filtered.length);
    }
    const groups: Record<string, PhanCong[]> = {};
    filtered.forEach(item => {
      if (!groups[item.tenMon]) groups[item.tenMon] = [];
      groups[item.tenMon].push(item);
    });
    return Object.keys(groups).map(key => ({ tenMon: key, schedules: groups[key] }));
  }, [PHAN_CONG_DATA, selectedWeek]);

  useEffect(() => {
    if (groupedSchedule.length === 1) {
        setExpandedSubject(groupedSchedule[0].tenMon);
    }
  }, [groupedSchedule]);

  const getStatus = (item: PhanCong): ScheduleStatus => {
    const now = new Date();
    if (now > item.endDateTime) return 'PAST';
    if (now >= item.startDateTime && now <= item.endDateTime) return 'HAPPENING';
    return 'FUTURE';
  };

  const renderScheduleRow = (item: PhanCong) => {
    const status = getStatus(item);
    const isNow = status === 'HAPPENING';
    const isPast = status === 'PAST';
    // Buổi quá khứ chỉ có thể điểm danh nếu admin đã duyệt mở lại (is_override = true)
    // Buổi có GV dạy thay → GV chính không điểm danh được
    const hasSubstitute = !!item.gv_day_thay;
    const canAttend = !hasSubstitute && (!isPast || (item.trang_thai === 'scheduled' && item.is_override === true));
    const isDisabled = !canAttend || item.trang_thai === 'completed' || item.trang_thai === 'cancelled';
    
    // Xác định icon và màu sắc dựa trên trạng thái điểm danh
    let iconName: any = 'ellipse-outline';
    let iconColor = COLORS.lightGray;
    let statusLabel = '';
    
    if (item.trang_thai === 'completed') {
      iconName = 'checkmark-circle';
      iconColor = COLORS.success;
      statusLabel = '✓ Đã điểm danh';
    } else if (item.trang_thai === 'cancelled') {
      iconName = 'close-circle';
      iconColor = '#dc3545';
      statusLabel = '✕ Đã hủy';
    } else if (isNow) {
      iconName = 'radio-button-on';
      iconColor = COLORS.success;
      statusLabel = '● Đang dạy';
    } else if (isPast && item.is_override) {
      iconName = 'refresh-circle';
      iconColor = '#F57C00';
      statusLabel = '↺ Được mở lại';
    } else if (item.gv_day_thay) {
      iconName = 'swap-horizontal';
      iconColor = '#9C27B0';
      statusLabel = `↔ ${item.gv_day_thay} dạy thay`;
    } else if (item.trang_thai === 'scheduled') {
      iconName = 'ellipse-outline';
      iconColor = isPast ? COLORS.lightGray : COLORS.primary;
    }
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.row, isNow && styles.rowNow, isDisabled && { opacity: 0.5 }]}
        disabled={isDisabled}
        onPress={() => router.push({ pathname: "/chi-tiet-lop", params: { lop_id: item?.lophocphan_id, ten_lop: item.tenLop, ngay_hoc: item.ngay_hoc_raw ?? '', buoi_id: item.id } })}
      >
        <View style={styles.timeline}>
          <Ionicons name={iconName} size={12} color={iconColor} />
          <View style={[styles.line, isDisabled && { backgroundColor: '#eee' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowHeader}>
            <Text style={[styles.textNgay, isDisabled && styles.textPast]}>{item.thu}, {item.ngay}</Text>
            {statusLabel !== '' && (
              <Text style={[
                styles.labelNow,
                item.trang_thai === 'completed' && { color: COLORS.success },
                item.trang_thai === 'cancelled' && { color: '#dc3545' }
              ]}>{statusLabel}</Text>
            )}
          </View>
          <Text style={[styles.textLop, isDisabled && styles.textPast]}>{item.tenLop}</Text>
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
        <View>
          <Text style={styles.welcomeText}>Xin chào Giảng viên,</Text>
          <Text style={styles.headerTitle}>Lịch Giảng Dạy</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            <View style={styles.dot} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* HIỂN THỊ HỌC KỲ THEO THỜI GIAN HIỆN TẠI */}
        <View style={styles.semesterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {HOC_KY.map(hk => (
              <TouchableOpacity 
                key={hk.id} 
                style={[styles.chip, activeSemester === hk.id && styles.chipActive]} 
                onPress={() => setActiveSemester(hk.id)}
              >
                <Text style={[styles.chipText, activeSemester === hk.id && { color: '#fff' }]}>{hk.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.weekBtn} onPress={() => setWeekModalVisible(true)}>
          <View style={styles.weekIcon}><Ionicons name="calendar" size={18} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.weekLabel}>Tuần học hiển thị</Text>
            <Text style={styles.weekValue} numberOfLines={1}>
                {selectedWeek ? `${selectedWeek.label} ${selectedWeek.detail}` : "Đang tải tuần học..."}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={COLORS.lightGray} />
        </TouchableOpacity>

        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : (
          <FlatList
            data={groupedSchedule}
            keyExtractor={it => it.tenMon}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isOpen = expandedSubject === item.tenMon;
              return (
                <View style={styles.card}>
                  <TouchableOpacity 
                    style={styles.cardHeader} 
                    onPress={() => { 
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpandedSubject(isOpen ? null : item.tenMon); 
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.tenMon}</Text>
                      <Text style={styles.cardSub}>{item.schedules.length} buổi dạy</Text>
                    </View>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  {isOpen && <View style={styles.cardBody}>{item.schedules.map(renderScheduleRow)}</View>}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={60} color="#ddd" />
                  <Text style={styles.empty}>Không có lịch dạy trong tuần này</Text>
              </View>
            }
          />
        )}

        <Modal visible={isWeekModalVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setWeekModalVisible(false)}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Chọn tuần học</Text>
              </View>
              <FlatList
                data={weeks}
                keyExtractor={it => it.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.modalItem, selectedWeek?.id === item.id && { backgroundColor: COLORS.activeWeek }]}
                    onPress={() => { setSelectedWeek(item); setWeekModalVisible(false); }}
                  >
                    <Text 
                      style={[styles.modalItemText, selectedWeek?.id === item.id && { color: COLORS.primary, fontWeight: 'bold' }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.modalItemDetail} numberOfLines={1}>{item.detail}</Text>
                    {selectedWeek?.id === item.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40, 
    paddingBottom: 20,
    backgroundColor: COLORS.background,
  },
  welcomeText: { fontSize: 13, color: COLORS.lightGray },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  notificationBtn: {
    width: 44, height: 44, backgroundColor: '#fff', 
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
  },
  dot: { 
    position: 'absolute', top: 12, right: 12, 
    width: 7, height: 7, backgroundColor: '#FF5252', borderRadius: 4, 
    borderWidth: 1.5, borderColor: '#fff' 
  },
  container: { flex: 1, paddingHorizontal: 16 },
  semesterWrapper: { height: 45, marginBottom: 10, marginTop: 5 },
  chip: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#eee' 
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#666' },
  weekBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    padding: 12, borderRadius: 12, marginBottom: 15, elevation: 1
  },
  weekIcon: { 
    width: 32, height: 32, backgroundColor: '#F0F7FF', borderRadius: 8, 
    justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
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
  labelNow: { fontSize: 11, color: COLORS.success, fontWeight: 'bold' },
  info: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 12, color: COLORS.lightGray, marginLeft: 4 },
  sep: { marginHorizontal: 8, color: '#ddd' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  empty: { textAlign: 'center', marginTop: 10, color: COLORS.lightGray, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { 
    backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, 
    padding: 20, maxHeight: '80%', paddingBottom: 40 
  },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#eee', borderRadius: 3, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalItem: { 
    flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, 
    borderBottomColor: '#f5f5f5', alignItems: 'center', paddingHorizontal: 10
  },
  modalItemText: { fontSize: 16, flexShrink: 0, marginRight: 8 },
  modalItemDetail: { fontSize: 14, color: '#888', flex: 1 }
});

