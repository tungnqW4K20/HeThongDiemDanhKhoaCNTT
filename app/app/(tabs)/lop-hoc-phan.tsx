'use strict';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { hocKyService } from '@/services/hocKyService';
import { phanCongService } from '@/services/phanCongService';
import { useAuth } from '../../components/ui/AuthContext';

// =================================================================
// TYPE DEFINITIONS & CONSTANTS
// =================================================================

type HocKy = { id: string; name: string; ngay_batdau: string; ngay_ketthuc: string; };

type ClassModule = {
  lophocphan_id: string;
  tenMon: string;
  cacLopHanhChinh: string;
  tongSoBuoi: number;
};

type GroupedSubject = {
  tenMon: string;
  classes: ClassModule[];
  tongSoBuoi: number;
};

const COLORS = {
  primary: '#3B5998',
  background: '#F0F2F5',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#A0A0A0',
  divider: '#E9EBF2',
  success: '#28a745',
  successBg: '#e6f4ea',
};

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [datePart] = dateStr.split('T'); 
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export default function LopHocPhanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [currentSemester, setCurrentSemester] = useState<HocKy | null>(null);
  const [classes, setClasses] = useState<GroupedSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Lấy học kỳ hiện tại
  useEffect(() => {
    (async () => {
      const res = await hocKyService.getAllHocKy();
      if (res.success && res.data.length > 0) {
        const now = new Date();
        const sorted = [...res.data].sort((a, b) => 
          parseDateSafe(a.ngay_batdau).getTime() - parseDateSafe(b.ngay_batdau).getTime()
        );

        let selected = sorted.find(item => {
          const start = parseDateSafe(item.ngay_batdau);
          const end = parseDateSafe(item.ngay_ketthuc);
          return now >= start && now <= end;
        });

        if (!selected) {
          selected = sorted.find(item => parseDateSafe(item.ngay_batdau) > now);
        }

        if (!selected) {
          selected = sorted[sorted.length - 1];
        }

        setCurrentSemester({ 
            id: selected.hocky_id, 
            name: selected.ten_hocky,
            ngay_batdau: selected.ngay_batdau,
            ngay_ketthuc: selected.ngay_ketthuc
        });
      }
    })();
  }, []);

  // Lấy dữ liệu lớp học phần
  const fetchClasses = useCallback(async () => {
    if (!currentSemester) return;
    try {
      setLoading(true);
      const res = await phanCongService.getLichGiangDay(currentSemester.id);

      if (!res.success || !res.data) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Nhóm dữ liệu theo lophocphan_id
      const classMap = new Map<string, ClassModule>();

      res.data.forEach((item: any) => {
        // Lọc bỏ các buổi học dạy thay (Giảng viên không phải là GV chính của môn này)
        if (item.is_my_substitute_session) return;

        if (!classMap.has(item.lophocphan_id)) {
            classMap.set(item.lophocphan_id, {
                lophocphan_id: item.lophocphan_id,
                tenMon: item.ten_mon || 'Không rõ môn',
                cacLopHanhChinh: item.cac_lop_hanh_chinh || 'N/A',
                tongSoBuoi: 1
            });
        } else {
            const existing = classMap.get(item.lophocphan_id)!;
            existing.tongSoBuoi += 1;
        }
      });

      const grouped = new Map<string, ClassModule[]>();
      classMap.forEach(cls => {
          if (!grouped.has(cls.tenMon)) {
              grouped.set(cls.tenMon, []);
          }
          grouped.get(cls.tenMon)!.push(cls);
      });

      const finalData: GroupedSubject[] = Array.from(grouped.entries()).map(([tenMon, classes]) => ({
          tenMon,
          classes,
          tongSoBuoi: classes.reduce((sum, c) => sum + c.tongSoBuoi, 0)
      }));

      setClasses(finalData);
      setLoading(false);
    } catch (e) { 
      console.error(e); 
      setLoading(false);
    }
  }, [currentSemester]);

  useFocusEffect(useCallback(() => { fetchClasses(); }, [fetchClasses]));

  // =================================================================
  // RENDER
  // =================================================================
  const renderClassItem = ({ item }: { item: GroupedSubject }) => {
    return (
      <View style={styles.card}>
        <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setExpandedSubject(expandedSubject === item.tenMon ? null : item.tenMon)}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="book-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.tenMon}</Text>
                <Text style={styles.cardSub}>{item.tongSoBuoi} buổi dạy</Text>
            </View>
            <Ionicons name={expandedSubject === item.tenMon ? "chevron-up" : "chevron-down"} size={20} color="#ccc" />
        </TouchableOpacity>
        
        {expandedSubject === item.tenMon && (
            <View style={styles.cardBody}>
                {item.classes.map(cls => (
                    <TouchableOpacity
                        key={cls.lophocphan_id}
                        style={styles.classRow}
                        onPress={() => router.push({ 
                            pathname: "/chi-tiet-diem-danh", 
                            params: { 
                                lop_id: cls.lophocphan_id, 
                                ten_lop: cls.tenMon, 
                                lop_hanhchinh_id: cls.cacLopHanhChinh
                            } 
                        })}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.classRowTitle}>Lớp: {cls.cacLopHanhChinh}</Text>
                            <View style={styles.classRowInfo}>
                                <Ionicons name="calendar-outline" size={12} color={COLORS.lightGray} />
                                <Text style={styles.classRowSub}> {cls.tongSoBuoi} buổi dạy</Text>
                            </View>
                        </View>
                        <View style={styles.classRowAction}>
                            <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.classRowActionText}>Xem điểm danh</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* HEADER */}
      <View style={styles.customHeader}>
        <View>
          <Text style={styles.welcomeText}>Danh sách</Text>
          <Text style={styles.headerTitle}>Lớp Học Phần</Text>
        </View>
      </View>

      <View style={styles.container}>
        {/* SEMESTER CHIP */}
        <View style={styles.semesterWrapper}>
            <View style={[styles.chip, styles.chipActive]}>
                <Text style={[styles.chipText, { color: '#fff' }]}>
                  {currentSemester ? currentSemester.name : "Đang tải..."}
                </Text>
            </View>
        </View>

        {/* MAIN LIST */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
        ) : (
          <FlatList
            data={classes}
            keyExtractor={it => it.tenMon}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={renderClassItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="library-outline" size={60} color="#ddd" />
                <Text style={styles.empty}>Chưa có lớp học phần nào được phân công trong học kỳ này.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// =================================================================
// STYLES
// =================================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  customHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40, 
    paddingBottom: 20, backgroundColor: COLORS.background 
  },
  welcomeText: { fontSize: 13, color: COLORS.lightGray },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  container: { flex: 1, paddingHorizontal: 16 },
  semesterWrapper: { height: 45, marginBottom: 10, marginTop: 5, flexDirection: 'row' },
  chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: '#666' },
  description: { fontSize: 13, color: '#666', marginBottom: 15, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2 },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  cardSub: { fontSize: 13, color: COLORS.lightGray, marginTop: 4 },
  cardBody: { borderTopWidth: 1, borderTopColor: '#f5f5f5', backgroundColor: '#FAFAFA' },
  classRow: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  classRowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  classRowInfo: { flexDirection: 'row', alignItems: 'center' },
  classRowSub: { fontSize: 12, color: COLORS.lightGray },
  classRowAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F4FD', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },
  classRowActionText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  empty: { textAlign: 'center', marginTop: 10, color: COLORS.lightGray, fontSize: 15 },
});
