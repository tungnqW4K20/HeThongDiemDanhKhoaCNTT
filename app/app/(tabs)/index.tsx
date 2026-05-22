import { phanCongService } from "@/services/phanCongService";
import { thongBaoService } from "@/services/thongBaoService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../components/ui/AuthContext";

const COLORS = {
  primary: "#3B5998",
  background: "#F0F2F5",
  white: "#FFFFFF",
  text: "#333333",
  lightGray: "#A0A0A0",
  cardShadow: "#000",
};

const DEFAULT_AVATAR = "https://thumbs.dreamstime.com/b/avatar-teacher-book-his-hands-d-style-adorable-cartoon-310669103.jpg";

// Hàm hỗ trợ tính toán thời gian dựa trên tiết học (Giả định quy chuẩn chung)
const getSlotTime = (dateStr: string, slot: number, isEnd = false) => {
  const date = new Date(dateStr);
  // Quy chuẩn: Tiết 1: 7h, Tiết 7: 13h, mỗi tiết 50p (có thể điều chỉnh theo trường)
  let hours = 7;
  let minutes = 0;

  if (slot >= 1 && slot <= 6) {
    hours = 6 + slot; // Tiết 1 -> 7h, Tiết 6 -> 12h
  } else if (slot >= 7) {
    hours = 6 + slot; // Tiết 7 -> 13h
  }

  if (isEnd) {
    date.setHours(hours, minutes + 45, 0); // Mỗi tiết học khoảng 45-50p
  } else {
    date.setHours(hours, minutes, 0);
  }
  return date;
};

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rawSchedule, setRawSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);

  const fetchNotificationBadge = useCallback(async () => {
    if (!user?.GiangVien?.giangvien_id) return;
    try {
      const [notifRes, missedRes] = await Promise.all([
        thongBaoService.getMyNotifications(),
        thongBaoService.getMissedAttendanceToday(),
      ]);

      let unreadCount = 0;
      if (notifRes.success && Array.isArray(notifRes.data)) {
        unreadCount = notifRes.data.filter((item: any) => !item.is_read).length;
      }

      let missedToday = 0;
      if (missedRes.success && Array.isArray(missedRes.data)) {
        missedToday = missedRes.data.length;
        setMissedCount(missedToday);
      }

      setBadgeCount(unreadCount + missedToday);
    } catch (error) {
      console.error("Lỗi lấy số lượng thông báo:", error);
    }
  }, [user]);

  useFocusEffect(fetchNotificationBadge);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.GiangVien?.giangvien_id) return;

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await phanCongService.getLichHomNay();
        if (res.success && Array.isArray(res.data)) {
          setRawSchedule(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [user]);

  const { upcomingClass, nextClasses } = useMemo(() => {
    if (!rawSchedule || rawSchedule.length === 0) {
      return { upcomingClass: null, nextClasses: [] };
    }

    const now = new Date();

    const processedClasses = rawSchedule.map((item) => {
      // Tính toán thời gian bắt đầu dựa trên tiết bắt đầu
      const startDate = getSlotTime(item.ngay_hoc, item.tiet_bat_dau);
      // Tính toán thời gian kết thúc dựa trên số tiết
      const endDate = getSlotTime(item.ngay_hoc, item.tiet_bat_dau + item.so_tiet - 1, true);

      return {
        ...item,
        startDate,
        endDate,
      };
    });

    // Lọc các lớp chưa kết thúc (hoặc diễn ra hôm nay) VÀ chưa điểm danh
    const validClasses = processedClasses
      .filter((item) => {
        const classDate = new Date(item.ngay_hoc);
        const isToday = classDate.getFullYear() === now.getFullYear() &&
                        classDate.getMonth() === now.getMonth() &&
                        classDate.getDate() === now.getDate();
        return (isToday || item.endDate > now) && item.trang_thai !== 'completed';
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    if (validClasses.length === 0) {
      return { upcomingClass: null, nextClasses: [] };
    }

    return {
      upcomingClass: validClasses[0],
      nextClasses: validClasses.slice(1),
    };
  }, [rawSchedule]);

  const navigateToAttendance = (item: any) => {
    router.push({
      pathname: "/chi-tiet-lop",
      params: {
        lop_id: item.lophocphan_id, // Gửi ID lớp học phần
        ten_lop: item.ten_mon,
        // lop_hanhchinh_id: item.cac_lop_hanh_chinh
      },
    });
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Don't render if user not logged in (will redirect)
  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Image 
            source={{ uri: "https://e7.pngegg.com/pngimages/584/337/png-clipart-ho-chi-minh-city-university-of-technology-and-education-hung-yen-university-of-technology-and-education-ho-chi-minh-city-pedagogical-university-college-estudents-triangle-logo-thumbnail.png" }} 
            style={styles.logo} 
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push("/thongbao")} style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={28} color={COLORS.text} />
              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile")}>
              <Image source={{ uri: DEFAULT_AVATAR }} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Chào mừng,</Text>
          <Text style={styles.teacherName}>
            {user?.GiangVien?.ho} {user?.GiangVien?.ten}
          </Text>
        </View>

        {/* Warning Banner for Missed Attendance */}
        {missedCount > 0 && (
          <TouchableOpacity
            style={styles.missedWarningBanner}
            onPress={() => router.push("/thongbao")}
            activeOpacity={0.8}
          >
            <Ionicons name="warning" size={22} color="#DC2626" />
            <Text style={styles.missedWarningText}>
              Bạn chưa điểm danh {missedCount} lớp dạy hôm nay! Bấm để xem.
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        )}

        {/* Upcoming Class Section */}
        {upcomingClass ? (
          <View style={styles.upcomingCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="clock" size={24} color={COLORS.primary} />
              <Text style={styles.upcomingTitle}>Lớp học sắp tới</Text>
            </View>
            <Text style={styles.upcomingCourseName} numberOfLines={2}>
              {upcomingClass.ten_mon}
            </Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>{upcomingClass.cac_lop_hanh_chinh}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {new Date(upcomingClass.ngay_hoc).toLocaleDateString("vi-VN", {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit'
                })}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              {/* <Text style={styles.infoText}>
                Tiết {upcomingClass.tiet_bat_dau} - {upcomingClass.tiet_bat_dau + upcomingClass.so_tiet - 1} ({upcomingClass.startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {upcomingClass.endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})
              </Text> */}
              <Text style={styles.infoText}>
                Tiết {upcomingClass.tiet_bat_dau} - {upcomingClass.tiet_bat_dau + upcomingClass.so_tiet - 1}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>Phòng: {upcomingClass.phong}</Text>
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigateToAttendance(upcomingClass)}>
              <Text style={styles.actionButtonText}>Bắt đầu điểm danh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.upcomingCard}>
             <Text style={styles.upcomingCourseName}>Không có lớp học nào sắp diễn ra.</Text>
          </View>
        )}

        {/* Next Classes Section */}
        <Text style={styles.sectionTitle}>Các lớp học tiếp theo</Text>
        <FlatList
          data={nextClasses}
          keyExtractor={(item) => item.buoi_id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>Không có lớp học nào khác trong hôm nay và ngày mai.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.classItemCard}>
              <View style={styles.classItemContent}>
                <Text style={styles.classItemCourseName} numberOfLines={1}>
                  {item.ten_mon}
                </Text>
                <Text style={styles.classItemInfo}>
                  Lớp: {item.cac_lop_hanh_chinh} | Tiết: {item.tiet_bat_dau} | Phòng: {item.phong}
                </Text>
                <Text style={styles.classItemInfo}>
                  {new Date(item.ngay_hoc).toLocaleDateString("vi-VN")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.lightGray} />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20, marginTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15 },
  logo: { width: 45, height: 45, resizeMode: "contain" },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 15 },
  notificationBtn: { position: "relative" },
  badge: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: "#DC2626",
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  missedWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  missedWarningText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  welcomeSection: { marginBottom: 20 },
  welcomeText: { fontSize: 18, color: COLORS.lightGray },
  teacherName: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  upcomingCard: { backgroundColor: COLORS.white, borderRadius: 15, padding: 20, marginBottom: 20, elevation: 4, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  upcomingTitle: { fontSize: 14, fontWeight: "600", color: COLORS.primary, marginLeft: 8 },
  upcomingCourseName: { fontSize: 20, fontWeight: "bold", color: COLORS.text, marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoText: { fontSize: 15, color: COLORS.text, marginLeft: 12, flex: 1 },
  actionButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 15 },
  actionButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "bold" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginBottom: 12 },
  classItemCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, elevation: 2 },
  classItemContent: { flex: 1, marginRight: 10 },
  classItemCourseName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  classItemInfo: { fontSize: 13, color: COLORS.lightGray, marginTop: 3 },
  emptyListText: { color: COLORS.lightGray, textAlign: 'center', marginTop: 20 }
});