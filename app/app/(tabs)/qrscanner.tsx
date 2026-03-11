import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  const lockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      lockRef.current = false;
      console.log("🔄 Reset scan lock (màn hình được focus lại)");
    }, [])
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Đang kiểm tra quyền camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Ứng dụng cần quyền camera để quét QR</Text>
        <Button title="Cấp quyền" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={async (data) => {
          if (lockRef.current) return;
          lockRef.current = true; 

          try {
            const url = data.data;
            console.log("📌 URL quét được:", url);

            const res = await fetch(url);
            const json = await res.json();

            console.log("📌 Dữ liệu trả về:", json);

            // 👉 Điều hướng sang màn danh sách lớp
            router.push({
              pathname: "/danh-sach-lop",
              params: { data: JSON.stringify(json.data) },
            });

          } catch (err) {
            console.error("❌ Lỗi fetch:", err);
            Alert.alert("Lỗi", "Không thể lấy dữ liệu từ QR");
          }
        }}
      />

      {/* 🔥 Nút đóng */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 30,
  },
  closeText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
});
