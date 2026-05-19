import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/components/ui/AuthContext';
import { giangVienService } from '@/services/giangVienService';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [hasAdvisoryClass, setHasAdvisoryClass] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!user) {
      setHasAdvisoryClass(null);
      return;
    }

    const checkAdvisoryClasses = async () => {
      try {
        const res = await giangVienService.getAdvisoryClasses();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setHasAdvisoryClass(true);
        } else {
          setHasAdvisoryClass(false);
        }
      } catch (error) {
        console.error("Lỗi kiểm tra lớp chủ nhiệm:", error);
        setHasAdvisoryClass(false);
      }
    };

    checkAdvisoryClasses();
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: user ? undefined : { display: 'none' }, // Ẩn toàn bộ tab bar khi chưa đăng nhập
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          href: user ? undefined : null, // Ẩn tab khi chưa đăng nhập
        }}
      />
      <Tabs.Screen
        name="lichday"
        options={{
          title: 'Lịch dạy',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
          href: user ? undefined : null, // Ẩn tab khi chưa đăng nhập
        }}
      />

      <Tabs.Screen
        name="lop-hoc-phan"
        options={{
          title: 'Lớp học phần',
          tabBarIcon: ({ color }) => <Ionicons name="library" size={24} color={color} />,
          href: user ? undefined : null, // Ẩn tab khi chưa đăng nhập
        }}
      />

      <Tabs.Screen
        name="de-xuat-lich-day-thay" 
        options={{
          title: 'Đề xuất thay thế',
          tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          href: user ? undefined : null, // Ẩn tab khi chưa đăng nhập
        }}
      />

      <Tabs.Screen
        name="lop-chu-nhiem" 
        options={{
          title: 'Lớp chủ nhiệm',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          href: (user && hasAdvisoryClass === true) ? undefined : null, // Chỉ hiện khi có ít nhất 1 lớp chủ nhiệm
        }}
      />

      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="qrscanner" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}


