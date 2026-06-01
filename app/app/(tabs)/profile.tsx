import { giangVienService } from '@/services/giangVienService'; // Import service vừa tạo
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../components/ui/AuthContext'; // Import AuthContext

// =================================================================
// 1. CÁC ĐỊNH NGHĨA KIỂU VÀ DỮ LIỆU
// =================================================================

// Kiểu dữ liệu khớp với phản hồi từ API Backend
type GiangVienProfile = {
  giangvien_id: string;
  ho_ten: string;
  ma_gv: string;
  email: string;
  sdt: string;
  don_vi_cong_tac: string;
  hoc_vi?: string; // Có thể null hoặc undefined
};

const COLORS = {
  primary: '#3B5998',
  background: '#F0F2F5',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#A0A0A0',
  cardShadow: '#000',
  danger: '#D9534F',
  divider: '#E9EBF2',
};

// Avatar mặc định nếu API không trả về ảnh (Hiện tại API chưa có field avatar)
const DEFAULT_AVATAR = 'https://thumbs.dreamstime.com/b/avatar-teacher-book-his-hands-d-style-adorable-cartoon-310669103.jpg';

// =================================================================
// 2. COMPONENT MÀN HÌNH THÔNG TIN CÁ NHÂN
// =================================================================

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth(); // Lấy user và hàm logout từ Context

  const [profile, setProfile] = useState<GiangVienProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Gọi API hoặc lấy thông tin từ session khi component được mount
  useEffect(() => {
    const fetchProfile = async () => {
      // Nếu là sinh viên, lấy thông tin trực tiếp từ user context (đã bao gồm thông tin chi tiết từ API đăng nhập)
      if (user?.role === 'sinhvien' && user?.SinhVien) {
        setProfile({
          giangvien_id: user.SinhVien.sinhvien_id,
          ho_ten: user.SinhVien.ten,
          ma_gv: user.SinhVien.ma_sv,
          email: user.SinhVien.email || "",
          sdt: user.SinhVien.sdt || "",
          don_vi_cong_tac: user.SinhVien.Lop?.ten_lop || "Chưa gán lớp",
          hoc_vi: "Sinh viên",
        } as any);
        setLoading(false);
        return;
      }

      // Kiểm tra xem user giảng viên đã đăng nhập chưa và có ID không
      if (!user?.GiangVien?.giangvien_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await giangVienService.getProfile(user.GiangVien.giangvien_id);

      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        // Xử lý lỗi nếu cần
        Alert.alert("Lỗi", "Không thể lấy thông tin giảng viên");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login'); 
  };


  type InfoRowProps = {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
  };

  const InfoRow = ({ icon, label, value }: InfoRowProps) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={24} color={COLORS.primary} style={styles.infoIcon} />
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Chưa cập nhật"}</Text>
      </View>
    </View>
  );

  type ActionRowProps = {
      icon: React.ComponentProps<typeof Ionicons>['name'];
      label: string;
      color: string;
      onPress: () => void;
  }

  const ActionRow = ({icon, label, color, onPress}: ActionRowProps) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
        <Ionicons name={icon} size={24} color={color} style={styles.actionIcon} />
        <Text style={[styles.actionLabel, { color: color }]}>{label}</Text>
        <Ionicons name="chevron-forward-outline" size={22} color={COLORS.lightGray} />
    </TouchableOpacity>
  );

  type InfoCardProps = {
      title: string;
      children: React.ReactNode;
  }
  
  const InfoCard = ({title, children}: InfoCardProps) => (
      <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.cardBody}>
              {children}
          </View>
      </View>
  );

  // Avatar tương ứng với vai trò sinh viên / giảng viên
  const avatarUrl = user?.role === 'sinhvien'
    ? 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png'
    : DEFAULT_AVATAR;

  // --- Render Loading ---
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // --- Render nếu chưa có dữ liệu profile ---
  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <Text style={{color: COLORS.text}}>Không tìm thấy thông tin tài khoản.</Text>
          <TouchableOpacity onPress={handleLogout} style={{marginTop: 20}}>
            <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Render màn hình chính ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Phần Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <Text style={styles.nameText}>{profile.ho_ten}</Text>
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>
              {user?.role === 'sinhvien' ? `MSSV: ${profile.ma_gv}` : `MSGV: ${profile.ma_gv}`}
            </Text>
          </View>
        </View>

        {/* Nhóm thông tin liên lạc */}
        <InfoCard title="Thông tin liên lạc">
            <InfoRow icon="mail" label="Email" value={profile.email} />
            <View style={styles.separator} />
            <InfoRow icon="call" label="Số điện thoại" value={profile.sdt} />
        </InfoCard>

        {/* Nhóm thông tin học tập hoặc chuyên môn tùy theo vai trò */}
        {user?.role === 'sinhvien' ? (
          <InfoCard title="Thông tin học tập">
              <InfoRow icon="business" label="Lớp hành chính" value={profile.don_vi_cong_tac} />
          </InfoCard>
        ) : (
          <InfoCard title="Thông tin chuyên môn">
              <InfoRow icon="business" label="Đơn vị công tác" value={profile.don_vi_cong_tac} />
              <View style={styles.separator} />
              <InfoRow icon="school" label="Học vị" value={profile.hoc_vi || "Chưa cập nhật"} />
          </InfoCard>
        )}
        
        {/* Nhóm các hành động */}
        <InfoCard title="Tài khoản">
            <ActionRow 
                icon="log-out-outline" 
                label="Đăng xuất" 
                color={COLORS.danger}
                onPress={handleLogout}
            />
        </InfoCard>

      </ScrollView>
    </SafeAreaView>
  );
}

// =================================================================
// 3. STYLES (Giữ nguyên như cũ)
// =================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.white,
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  nameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  idBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  idBadgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  cardContainer: {
    marginBottom: 20,
  },
  cardTitle:{
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.lightGray,
      marginBottom: 10,
      paddingHorizontal: 10,
  },
  cardBody: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoIcon: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.lightGray,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
});