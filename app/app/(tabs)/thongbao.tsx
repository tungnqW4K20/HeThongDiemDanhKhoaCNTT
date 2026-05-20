import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { thongBaoService } from "@/services/thongBaoService";
import { useAuth } from "@/components/ui/AuthContext";

const COLORS = {
  primary: "#3B5998",
  background: "#F0F2F5",
  white: "#FFFFFF",
  text: "#333333",
  lightGray: "#A0A0A0",
  warning: "#D97706",
  warningBg: "#FEF3C7",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  success: "#10B981",
  border: "#E5E7EB",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [missedClasses, setMissedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = async () => {
    if (!user) return;
    try {
      const [notifRes, missedRes] = await Promise.all([
        thongBaoService.getMyNotifications(),
        thongBaoService.getMissedAttendanceToday(),
      ]);

      if (notifRes.success && Array.isArray(notifRes.data)) {
        setNotifications(notifRes.data);
      }
      if (missedRes.success && Array.isArray(missedRes.data)) {
        setMissedClasses(missedRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications or missed classes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await thongBaoService.markAsRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.thongbao_id === id ? { ...notif, is_read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const navigateToAttendance = (item: any) => {
    router.push({
      pathname: "/chi-tiet-lop",
      params: {
        lop_id: item.lophocphan_id,
        ten_lop: item.ten_lop,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Today's Missed Attendance Warnings */}
        {missedClasses.length > 0 && (
          <View style={styles.warningContainer}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons name="alert-decagram" size={24} color={COLORS.danger} />
              <Text style={styles.warningTitle}>Chưa điểm danh hôm nay</Text>
            </View>
            <Text style={styles.warningSubText}>
              Bạn có {missedClasses.length} lớp học hôm nay chưa thực hiện điểm danh:
            </Text>
            {missedClasses.map((item) => (
              <View key={item.buoi_id} style={styles.missedClassCard}>
                <View style={styles.missedClassDetails}>
                  <Text style={styles.missedClassName} numberOfLines={1}>
                    {item.ten_lop}
                  </Text>
                  <Text style={styles.missedClassInfo}>
                    Mã: {item.ma_lop} | Phòng: {item.phong}
                  </Text>
                  <Text style={styles.missedClassInfo}>
                    Tiết bắt đầu: {item.tiet_bat_dau} ({item.so_tiet} tiết)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.attendanceButton}
                  onPress={() => navigateToAttendance(item)}
                >
                  <Text style={styles.attendanceButtonText}>Điểm danh</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Section 2: General Student / System Notifications */}
        <Text style={styles.sectionTitle}>Thông báo hệ thống</Text>
        
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Bạn không có thông báo nào.</Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.thongbao_id}
              style={[
                styles.notificationCard,
                !item.is_read && styles.unreadCard,
              ]}
              onPress={() => {
                if (!item.is_read) {
                  handleMarkAsRead(item.thongbao_id);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.notifHeader}>
                <View style={styles.titleContainer}>
                  {!item.is_read && <View style={styles.unreadDot} />}
                  <Text style={[styles.notifTitle, !item.is_read && styles.unreadTitle]}>
                    {item.tieude}
                  </Text>
                </View>
                <Text style={styles.notifTime}>
                  {new Date(item.ngay_tao).toLocaleDateString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text style={styles.notifBody}>{item.noidung}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  refreshButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
  },
  warningContainer: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.danger,
    marginLeft: 8,
  },
  warningSubText: {
    fontSize: 13,
    color: "#7F1D1D",
    marginBottom: 12,
  },
  missedClassCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  missedClassDetails: {
    flex: 1,
    marginRight: 8,
  },
  missedClassName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  missedClassInfo: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 2,
  },
  attendanceButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  attendanceButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 4,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  unreadCard: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginRight: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  unreadTitle: {
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  notifTime: {
    fontSize: 11,
    color: COLORS.lightGray,
  },
  notifBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.lightGray,
  },
});
