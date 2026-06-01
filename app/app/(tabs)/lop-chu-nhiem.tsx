import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/ui/AuthContext";
import { giangVienService } from "@/services/giangVienService";
import { hocKyService } from "@/services/hocKyService";

const COLORS = {
  primary: "#3B5998",
  primaryLight: "#ECEFF7",
  background: "#F0F2F5",
  white: "#FFFFFF",
  text: "#333333",
  textLight: "#777777",
  border: "#E5E7EB",
  success: "#4CAF50",
  warning: "#FFC107",
  danger: "#FF5A5F",
  info: "#2196F3",
};

export default function LopChuNhiemScreen() {
  const { user } = useAuth();
  
  const [semesters, setSemesters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // BỘ LỌC VÀ SẮP XẾP MỚI
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("absentRate");
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  // UI Select Modals
  const [semesterModalVisible, setSemesterModalVisible] = useState(false);
  const [classModalVisible, setClassModalVisible] = useState(false);
  
  // Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Animated values for bottom sheet transition
  const [semesterSlide] = useState(new Animated.Value(500));
  const [classSlide] = useState(new Animated.Value(500));
  const [detailSlide] = useState(new Animated.Value(800));

  // Trigger animations when visibility changes
  useEffect(() => {
    if (semesterModalVisible) {
      Animated.spring(semesterSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      semesterSlide.setValue(500);
    }
  }, [semesterModalVisible]);

  useEffect(() => {
    if (classModalVisible) {
      Animated.spring(classSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      classSlide.setValue(500);
    }
  }, [classModalVisible]);

  useEffect(() => {
    if (detailModalVisible) {
      Animated.spring(detailSlide, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      detailSlide.setValue(800);
    }
  }, [detailModalVisible]);

  // Animated close handlers
  const closeSemesterModal = () => {
    Animated.timing(semesterSlide, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSemesterModalVisible(false);
    });
  };

  const closeClassModal = () => {
    Animated.timing(classSlide, {
      toValue: 500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setClassModalVisible(false);
    });
  };

  const closeDetailModal = () => {
    Animated.timing(detailSlide, {
      toValue: 800,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDetailModalVisible(false);
    });
  };

  // Load initial data
  useEffect(() => {
    if (!user) return;
    
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Fetch semesters
        const semRes = await hocKyService.getAllHocKy();
        let loadedSemesters: any[] = [];
        if (semRes.success && Array.isArray(semRes.data)) {
          loadedSemesters = semRes.data;
          setSemesters(loadedSemesters);
          
          // Default select the latest semester (ordered by date or ID)
          if (loadedSemesters.length > 0) {
            const sorted = [...loadedSemesters].sort((a, b) => b.hocky_id - a.hocky_id);
            setSelectedSemester(sorted[0]);
          }
        }
        
        // 2. Fetch advisory classes
        const classRes = await giangVienService.getAdvisoryClasses();
        if (classRes.success && Array.isArray(classRes.data)) {
          setClasses(classRes.data);
          if (classRes.data.length > 0) {
            setSelectedClass(classRes.data[0]);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu khởi tạo:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, [user]);

  // Fetch attendance list when class or semester changes
  const fetchAttendance = async (showIndicator = true) => {
    if (!selectedClass) return;
    
    if (showIndicator) setLoading(true);
    try {
      const res = await giangVienService.getAdvisoryClassAttendance(
        selectedClass.lop_hanhchinh_id,
        selectedSemester?.hocky_id
      );
      if (res.success && Array.isArray(res.data)) {
        setStudents(res.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải tình trạng chuyên cần:", error);
      setStudents([]);
    } finally {
      if (showIndicator) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      setSelectedMonth("all");
      setSelectedSubject("all");
      fetchAttendance();
    }
  }, [selectedClass, selectedSemester]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance(false);
  };

  // 1. Lọc danh sách Môn học duy nhất trong lớp chủ nhiệm
  const uniqueSubjects = useMemo(() => {
    const subjects = new Map();
    students.forEach(student => {
      student.courses?.forEach((course: any) => {
        if (course.ma_mon && course.ten_mon) {
          subjects.set(course.ma_mon, course.ten_mon);
        }
      });
    });
    return Array.from(subjects.entries()).map(([ma_mon, ten_mon]) => ({ ma_mon, ten_mon }));
  }, [students]);

  // 2. Lọc các Tháng duy nhất có dữ liệu buổi học
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    students.forEach(student => {
      student.courses?.forEach((course: any) => {
        course.sessions?.forEach((session: any) => {
          if (session.ngay) {
            const date = new Date(session.ngay);
            const monthVal = String(date.getMonth() + 1).padStart(2, '0');
            months.add(monthVal);
          }
        });
      });
    });
    return Array.from(months).sort();
  }, [students]);

  // 3. Tính toán lại số liệu và lọc/sắp xếp danh sách học sinh theo bộ lọc động
  const processedStudents = useMemo(() => {
    const list = students.map(student => {
      let filteredCourses = student.courses || [];
      
      // Lọc theo môn học
      if (selectedSubject !== "all") {
        filteredCourses = filteredCourses.filter((c: any) => c.ma_mon === selectedSubject);
      }

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      let totalExcused = 0;
      let totalSessions = 0;

      const updatedCourses = filteredCourses.map((course: any) => {
        let filteredSessions = course.sessions || [];
        
        // Lọc theo tháng
        if (selectedMonth !== "all") {
          filteredSessions = filteredSessions.filter((s: any) => {
            if (!s.ngay) return false;
            const date = new Date(s.ngay);
            const m = String(date.getMonth() + 1).padStart(2, '0');
            return m === selectedMonth;
          });
        }

        const absent = filteredSessions.filter((s: any) => s.trangthai === 'absent').length;
        const late = filteredSessions.filter((s: any) => s.trangthai === 'late').length;
        const excused = filteredSessions.filter((s: any) => s.trangthai === 'excused').length;
        const total = filteredSessions.length;
        const present = total > 0 ? (total - absent - late - excused) : 0;

        totalPresent += present;
        totalAbsent += absent;
        totalLate += late;
        totalExcused += excused;
        totalSessions += total;

        return {
          ...course,
          filteredStats: {
            present,
            absent,
            late,
            excused,
            total
          }
        };
      });

      const absRate = totalSessions > 0 ? totalAbsent / totalSessions : 0;

      return {
        ...student,
        calculated_stats: {
          present: totalPresent,
          absent: totalAbsent,
          late: totalLate,
          excused: totalExcused,
          total: totalSessions,
          absRate
        },
        calculated_courses: updatedCourses
      };
    });

    // Lọc theo từ khóa tìm kiếm
    let filtered = list;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.ho_ten?.toLowerCase().includes(query) ||
          s.ma_sv?.toLowerCase().includes(query)
      );
    }

    // Sắp xếp
    if (sortOption === "absentRate") {
      filtered.sort((a, b) => {
        const rateDiff = b.calculated_stats.absRate - a.calculated_stats.absRate;
        if (Math.abs(rateDiff) > 0.001) return rateDiff;
        const countDiff = b.calculated_stats.absent - a.calculated_stats.absent;
        if (countDiff !== 0) return countDiff;
        return a.ho_ten.localeCompare(b.ho_ten, 'vi');
      });
    } else {
      // Sắp xếp mặc định theo tên
      filtered.sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'));
    }

    return filtered;
  }, [students, selectedMonth, selectedSubject, sortOption, searchQuery]);

  // Check if a student has any course with > 20% absence rate
  const checkWarningStatus = (student: any) => {
    if (!student.courses || student.courses.length === 0) return { warning: false, text: "" };
    
    let highestAbsentRate = 0;
    let totalAbsentSessions = 0;
    
    for (const course of student.courses) {
      const { absent, total } = course.stats || {};
      if (total > 0) {
        const rate = absent / total;
        if (rate > highestAbsentRate) {
          highestAbsentRate = rate;
        }
        totalAbsentSessions += absent;
      }
    }

    if (highestAbsentRate > 0.20) {
      return { 
        warning: true, 
        level: "danger",
        text: `Cảnh báo: Vắng > 20% (${Math.round(highestAbsentRate * 100)}%)` 
      };
    } else if (highestAbsentRate > 0.10 || totalAbsentSessions >= 3) {
      return { 
        warning: true, 
        level: "warning",
        text: "Cảnh báo nhẹ: Nghỉ nhiều" 
      };
    }
    
    return { warning: false, text: "" };
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      alert("Không thể thực hiện cuộc gọi");
    });
  };

  const handleEmail = (email: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      alert("Không thể mở ứng dụng gửi thư");
    });
  };

  // Helper to draw attendance rate circle/pill styles
  const getAttendanceStyle = (absentRate: number) => {
    if (absentRate > 0.20) {
      return { color: COLORS.danger, label: "Kém" };
    } else if (absentRate > 0.10) {
      return { color: COLORS.warning, label: "Trung bình" };
    }
    return { color: COLORS.success, label: "Tốt" };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lớp Chủ Nhiệm</Text>
        <Text style={styles.headerSub}>Theo dõi chuyên cần lớp hành chính</Text>
      </View>

      {/* SELECTORS ROW */}
      <View style={styles.selectorsRow}>
        {/* Semester selector */}
        <TouchableOpacity 
          style={styles.selectorBtn} 
          onPress={() => setSemesterModalVisible(true)}
        >
          <View style={styles.selectorTextWrap}>
            <Text style={styles.selectorLabel}>Học kỳ</Text>
            <Text style={styles.selectorValue} numberOfLines={1}>
              {selectedSemester ? selectedSemester.ten_hocky : "Chọn học kỳ"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Class selector */}
        <TouchableOpacity 
          style={styles.selectorBtn} 
          onPress={() => setClassModalVisible(true)}
        >
          <View style={styles.selectorTextWrap}>
            <Text style={styles.selectorLabel}>Lớp chủ nhiệm</Text>
            <Text style={styles.selectorValue} numberOfLines={1}>
              {selectedClass ? selectedClass.ten_lop : "Chọn lớp"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* CLASS METADATA CARD */}
      {selectedClass && (
        <View style={styles.classMetaCard}>
          <View style={styles.classMetaHeader}>
            <Ionicons name="school-outline" size={20} color={COLORS.primary} />
            <Text style={styles.classMetaName}>{selectedClass.ten_lop}</Text>
          </View>
          <View style={styles.classMetaDetails}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Niên khóa</Text>
              <Text style={styles.metaVal}>{selectedClass.nien_khoa || "N/A"}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Sĩ số</Text>
              <Text style={styles.metaVal}>{selectedClass.si_so || 0} học sinh</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Chương trình</Text>
              <Text style={styles.metaVal} numberOfLines={1}>
                {selectedClass.chuong_trinh || "Chính quy"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* SEARCH BAR & FILTER SECTION */}
      {classes.length > 0 && (
        <View style={{ position: "relative", zIndex: 10 }}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên hoặc MSSV..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={{ marginRight: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            ) : null}
            
            {/* Vertical Separator */}
            <View style={styles.searchDivider} />

            {/* Filter funnel toggle button inside search container */}
            <TouchableOpacity 
              style={styles.filterToggleBtn} 
              onPress={() => setFiltersVisible(!filtersVisible)}
            >
              <Ionicons 
                name={filtersVisible ? "funnel" : "funnel-outline"} 
                size={20} 
                color={(selectedMonth !== "all" || selectedSubject !== "all") ? COLORS.primary : COLORS.textLight} 
              />
              {(selectedMonth !== "all" || selectedSubject !== "all") && (
                <View style={styles.filterDot} />
              )}
            </TouchableOpacity>
          </View>

          {/* BỘ LỌC ĐỘNG (MÔN, THÁNG, SẮP XẾP) */}
          {students.length > 0 && filtersVisible && (
            <View style={styles.filterSectionContainer}>
              {/* Lọc theo môn */}
              <View style={styles.filterRow}>
                <Text style={styles.filterRowLabel}>Môn học:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll} style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.filterPill, selectedSubject === "all" && styles.filterPillActive]}
                    onPress={() => setSelectedSubject("all")}
                  >
                    <Text style={[styles.filterPillText, selectedSubject === "all" && styles.filterPillTextActive]}>
                      Tất cả môn
                    </Text>
                  </TouchableOpacity>
                  {uniqueSubjects.map((sub: any) => (
                    <TouchableOpacity
                      key={sub.ma_mon}
                      style={[styles.filterPill, selectedSubject === sub.ma_mon && styles.filterPillActive]}
                      onPress={() => setSelectedSubject(sub.ma_mon)}
                    >
                      <Text style={[styles.filterPillText, selectedSubject === sub.ma_mon && styles.filterPillTextActive]}>
                        {sub.ten_mon}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Lọc theo tháng */}
              <View style={styles.filterRow}>
                <Text style={styles.filterRowLabel}>Tháng học:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll} style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.filterPill, selectedMonth === "all" && styles.filterPillActive]}
                    onPress={() => setSelectedMonth("all")}
                  >
                    <Text style={[styles.filterPillText, selectedMonth === "all" && styles.filterPillTextActive]}>
                      Cả học kỳ
                    </Text>
                  </TouchableOpacity>
                  {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((monthStr) => {
                    const hasSessions = uniqueMonths.includes(monthStr);
                    if (!hasSessions && uniqueMonths.length > 0) return null;

                    return (
                      <TouchableOpacity
                        key={monthStr}
                        style={[styles.filterPill, selectedMonth === monthStr && styles.filterPillActive]}
                        onPress={() => setSelectedMonth(monthStr)}
                      >
                        <Text style={[styles.filterPillText, selectedMonth === monthStr && styles.filterPillTextActive]}>
                          Tháng {parseInt(monthStr)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Sắp xếp nhanh */}
              <View style={styles.sortRow}>
                <Text style={styles.filterRowLabel}>Sắp xếp:</Text>
                <View style={styles.sortBtnGroup}>
                  <TouchableOpacity
                    style={[styles.sortBtn, sortOption === "absentRate" && styles.sortBtnActive]}
                    onPress={() => setSortOption("absentRate")}
                  >
                    <Ionicons name="trending-down-outline" size={14} color={sortOption === "absentRate" ? COLORS.white : COLORS.textLight} style={{ marginRight: 4 }} />
                    <Text style={[styles.sortBtnText, sortOption === "absentRate" && styles.sortBtnTextActive]}>
                      Tỷ lệ vắng
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortBtn, sortOption === "default" && styles.sortBtnActive]}
                    onPress={() => setSortOption("default")}
                  >
                    <Ionicons name="text-outline" size={14} color={sortOption === "default" ? COLORS.white : COLORS.textLight} style={{ marginRight: 4 }} />
                    <Text style={[styles.sortBtnText, sortOption === "default" && styles.sortBtnTextActive]}>
                      Tên học sinh
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* CONTENT / STUDENT LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu học sinh...</Text>
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Không có lớp chủ nhiệm</Text>
          <Text style={styles.emptySub}>
            Tài khoản của bạn chưa được liên kết chủ nhiệm với lớp hành chính nào.
          </Text>
        </View>
      ) : processedStudents.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Ionicons name="search-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Không tìm thấy học sinh</Text>
          <Text style={styles.emptySub}>
            Không tìm thấy học sinh phù hợp với bộ lọc hiện tại của bạn.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={processedStudents}
          keyExtractor={(item) => item.sinhvien_id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const warningInfo = checkWarningStatus(item);
            const initial = item.ho_ten ? item.ho_ten.split(" ").pop()?.charAt(0).toUpperCase() : "S";
            
            // Tính toán số liệu vắng động theo bộ lọc đã chọn
            const overallAbs = item.calculated_stats?.absent || 0;
            const overallTot = item.calculated_stats?.total || 0;
            const absRate = item.calculated_stats?.absRate || 0;
            const styleAttr = getAttendanceStyle(absRate);

            return (
              <TouchableOpacity
                style={styles.studentCard}
                onPress={() => {
                  setSelectedStudent(item);
                  setDetailModalVisible(true);
                }}
              >
                {/* Left Profile Initials */}
                <View style={[styles.avatarCircle, { backgroundColor: warningInfo.warning ? (warningInfo.level === 'danger' ? '#FFEBEE' : '#FFFDE7') : COLORS.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: warningInfo.warning ? (warningInfo.level === 'danger' ? COLORS.danger : COLORS.warning) : COLORS.primary }]}>
                    {initial}
                  </Text>
                </View>

                {/* Center Student Info */}
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {item.ho_ten}
                  </Text>
                  <Text style={styles.studentCode}>MSSV: {item.ma_sv}</Text>
                  
                  {warningInfo.warning ? (
                    <View style={[styles.warningBadge, { backgroundColor: warningInfo.level === 'danger' ? '#FFEBEE' : '#FFFDE7' }]}>
                      <Ionicons 
                        name="warning" 
                        size={12} 
                        color={warningInfo.level === 'danger' ? COLORS.danger : '#F57F17'} 
                      />
                      <Text style={[styles.warningBadgeText, { color: warningInfo.level === 'danger' ? COLORS.danger : '#F57F17' }]}>
                        {warningInfo.text}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.studentStatusNormal}>Học tập bình thường</Text>
                  )}
                </View>

                {/* Right Attendance Stats */}
                <View style={styles.studentStats}>
                  {overallTot > 0 ? (
                    <>
                      <Text style={[styles.statsRateText, { color: styleAttr.color }]}>
                        Vắng {overallAbs} buổi
                      </Text>
                      <Text style={styles.statsLabel}>
                        Tổng học: {overallTot} buổi
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: styleAttr.color + "15" }]}>
                        <Text style={[styles.statusPillText, { color: styleAttr.color }]}>
                          {styleAttr.label}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.statsRateText, { color: COLORS.textLight, fontSize: 12 }]}>
                        Chưa học
                      </Text>
                      <Text style={styles.statsLabel}>
                        Không có lịch
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ================= MODAL CHỌN HỌC KỲ ================= */}
      <Modal 
        visible={semesterModalVisible} 
        animationType="fade" 
        transparent
        onRequestClose={closeSemesterModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeSemesterModal}
        >
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: semesterSlide }] }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn học kỳ</Text>
                <TouchableOpacity onPress={closeSemesterModal}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={semesters}
                keyExtractor={(item) => item.hocky_id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      selectedSemester?.hocky_id === item.hocky_id && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedSemester(item);
                      closeSemesterModal();
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedSemester?.hocky_id === item.hocky_id && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item.ten_hocky}
                    </Text>
                    {selectedSemester?.hocky_id === item.hocky_id && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL CHỌN LỚP ================= */}
      <Modal 
        visible={classModalVisible} 
        animationType="fade" 
        transparent
        onRequestClose={closeClassModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeClassModal}
        >
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: classSlide }] }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn lớp chủ nhiệm</Text>
                <TouchableOpacity onPress={closeClassModal}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={classes}
                keyExtractor={(item) => item.lop_hanhchinh_id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      selectedClass?.lop_hanhchinh_id === item.lop_hanhchinh_id && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedClass(item);
                      closeClassModal();
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedClass?.lop_hanhchinh_id === item.lop_hanhchinh_id && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item.ten_lop}
                    </Text>
                    {selectedClass?.lop_hanhchinh_id === item.lop_hanhchinh_id && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODAL CHI TIẾT ĐIỂM DANH HỌC SINH ================= */}
      <Modal 
        visible={detailModalVisible} 
        animationType="fade" 
        transparent
        onRequestClose={closeDetailModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeDetailModal}
        >
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, styles.detailModalContent, { transform: [{ translateY: detailSlide }] }]}>
              {selectedStudent && (
                <>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.detailStudentName}>{selectedStudent.ho_ten}</Text>
                      <Text style={styles.detailStudentCode}>MSSV: {selectedStudent.ma_sv}</Text>
                    </View>
                    <TouchableOpacity onPress={closeDetailModal}>
                      <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                    {/* Quick Contacts */}
                    <View style={styles.contactSection}>
                      <Text style={styles.sectionSubtitle}>Thông tin liên hệ</Text>
                      <View style={styles.contactRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.contactText}>Email: {selectedStudent.email || "Chưa cập nhật"}</Text>
                          <Text style={styles.contactText}>SĐT: {selectedStudent.sdt || "Chưa cập nhật"}</Text>
                        </View>
                        <View style={styles.contactActions}>
                          {selectedStudent.sdt ? (
                            <TouchableOpacity 
                              style={[styles.contactIconBtn, { backgroundColor: COLORS.success }]} 
                              onPress={() => handleCall(selectedStudent.sdt)}
                            >
                              <Ionicons name="call" size={18} color={COLORS.white} />
                            </TouchableOpacity>
                          ) : null}
                          {selectedStudent.email ? (
                            <TouchableOpacity 
                              style={[styles.contactIconBtn, { backgroundColor: COLORS.info }]} 
                              onPress={() => handleEmail(selectedStudent.email)}
                            >
                              <Ionicons name="mail" size={18} color={COLORS.white} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* Attendance Breakdown List */}
                    <Text style={[styles.sectionSubtitle, { marginTop: 15 }]}>
                      Chi tiết chuyên cần {(selectedMonth !== "all" || selectedSubject !== "all") ? "(Bộ lọc đang áp dụng)" : "học kỳ"}
                    </Text>
                    
                    {(!selectedStudent.calculated_courses || selectedStudent.calculated_courses.length === 0) ? (
                      <View style={styles.noCoursesCard}>
                        <Ionicons name="book-outline" size={32} color={COLORS.textLight} />
                        <Text style={styles.noCoursesText}>Học sinh này chưa đăng ký môn học nào hoặc không khớp bộ lọc.</Text>
                      </View>
                    ) : (
                      selectedStudent.calculated_courses.map((course: any) => {
                        const { present, absent, late, excused, total } = course.filteredStats || course.stats || {};
                        const absRate = total > 0 ? absent / total : 0;
                        const ratePercent = total > 0 ? Math.round((present + late + excused) / total * 100) : 100;
                        
                        let progressColor = COLORS.success;
                        if (absRate > 0.20) progressColor = COLORS.danger;
                        else if (absRate > 0.10) progressColor = COLORS.warning;

                        return (
                          <View key={course.lophocphan_id} style={styles.courseItemCard}>
                            <View style={styles.courseItemHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.courseName}>{course.ten_mon || course.ten_lophocphan}</Text>
                                <Text style={styles.courseCode}>Mã môn: {course.ma_mon || "N/A"}  |  Lớp: {course.ma_lop}</Text>
                                <Text style={styles.courseLecturer}>Giảng viên: {course.ten_giangvien || "Chưa phân công"}</Text>
                              </View>
                              {total > 0 ? (
                                <View style={[styles.attendancePercentPill, { backgroundColor: progressColor + "15" }]}>
                                  <Text style={[styles.attendancePercentText, { color: progressColor }]}>
                                    {ratePercent}% đi học
                                  </Text>
                                </View>
                              ) : (
                                <View style={[styles.attendancePercentPill, { backgroundColor: "#F3F4F6" }]}>
                                  <Text style={[styles.attendancePercentText, { color: COLORS.textLight }]}>
                                    Chưa có lịch
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Progress bar */}
                            {total > 0 && (
                              <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${ratePercent}%`, backgroundColor: progressColor }]} />
                              </View>
                            )}

                            {/* Breakdown counters */}
                            <View style={styles.countersRow}>
                              <View style={styles.counterBox}>
                                <Text style={[styles.counterVal, { color: COLORS.success }]}>{present}</Text>
                                <Text style={styles.counterLabel}>Có mặt</Text>
                              </View>
                              <View style={styles.counterBox}>
                                <Text style={[styles.counterVal, { color: COLORS.info }]}>{late}</Text>
                                <Text style={styles.counterLabel}>Muộn</Text>
                              </View>
                              <View style={styles.counterBox}>
                                <Text style={[styles.counterVal, { color: COLORS.warning }]}>{excused}</Text>
                                <Text style={styles.counterLabel}>Có phép</Text>
                              </View>
                              <View style={styles.counterBox}>
                                <Text style={[styles.counterVal, { color: COLORS.danger }]}>{absent}</Text>
                                <Text style={styles.counterLabel}>Vắng</Text>
                              </View>
                              <View style={styles.counterBox}>
                                <Text style={styles.counterVal}>{total}</Text>
                                <Text style={styles.counterLabel}>Tổng buổi</Text>
                              </View>
                            </View>
                            
                            {absRate > 0.20 && total > 0 && (
                              <View style={styles.courseWarningAlert}>
                                <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                                <Text style={styles.courseWarningAlertText}>
                                  Học sinh đã vắng vượt quá định mức 20% của học phần này!
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, backgroundColor: COLORS.white },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.primary },
  headerSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  
  selectorsRow: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  selectorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  selectorTextWrap: { flex: 1, marginRight: 5 },
  selectorLabel: { fontSize: 10, color: COLORS.textLight, textTransform: "uppercase" },
  selectorValue: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginTop: 1 },

  classMetaCard: {
    margin: 15,
    marginBottom: 5,
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  classMetaHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  classMetaName: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  classMetaDetails: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaCol: { flex: 1, alignItems: "center" },
  metaLabel: { fontSize: 11, color: COLORS.textLight },
  metaVal: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginTop: 3 },
  metaDivider: { width: 1, height: 25, backgroundColor: COLORS.border },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  filterToggleBtn: {
    padding: 4,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  filterDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },

  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  loadingText: { marginTop: 10, color: COLORS.textLight, fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginTop: 15 },
  emptySub: { fontSize: 13, color: COLORS.textLight, textAlign: "center", marginTop: 8, lineHeight: 18 },

  listContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 30 },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "bold" },
  studentInfo: { flex: 1, justifyContent: "center" },
  studentName: { fontSize: 15, fontWeight: "bold", color: COLORS.text },
  studentCode: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  studentStatusNormal: { fontSize: 11, color: COLORS.success, marginTop: 4, fontWeight: "500" },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5,
  },
  warningBadgeText: { fontSize: 10, fontWeight: "bold" },

  studentStats: { alignItems: "flex-end", justifyContent: "center" },
  statsRateText: { fontSize: 14, fontWeight: "bold" },
  statsLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginTop: 5 },
  statusPillText: { fontSize: 9, fontWeight: "bold", textTransform: "uppercase" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
    maxHeight: "80%",
  },
  detailModalContent: {
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionSelected: { backgroundColor: COLORS.primaryLight },
  modalOptionText: { fontSize: 15, color: COLORS.text },
  modalOptionTextSelected: { color: COLORS.primary, fontWeight: "bold" },

  detailScroll: { padding: 20 },
  detailStudentName: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  detailStudentCode: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  
  contactSection: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sectionSubtitle: { fontSize: 14, fontWeight: "bold", color: COLORS.text, marginBottom: 8 },
  contactRow: { flexDirection: "row", alignItems: "center" },
  contactText: { fontSize: 13, color: COLORS.text, marginVertical: 2 },
  contactActions: { flexDirection: "row", gap: 10, marginLeft: 10 },
  contactIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },

  noCoursesCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  noCoursesText: { fontSize: 13, color: COLORS.textLight, textAlign: "center", marginTop: 8 },

  courseItemCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  courseItemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  courseName: { fontSize: 14, fontWeight: "bold", color: COLORS.text, flex: 1 },
  courseCode: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  courseLecturer: { fontSize: 11, color: COLORS.text, marginTop: 4, fontWeight: "500" },
  attendancePercentPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  attendancePercentText: { fontSize: 10, fontWeight: "bold" },
  
  progressBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginVertical: 12, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },

  countersRow: { flexDirection: "row", justifyContent: "space-between" },
  counterBox: { flex: 1, alignItems: "center" },
  counterVal: { fontSize: 14, fontWeight: "bold", color: COLORS.text },
  counterLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 2, textAlign: "center" },
  
  courseWarningAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 6,
    padding: 8,
    marginTop: 12,
    gap: 6,
  },
  courseWarningAlertText: { fontSize: 10, color: COLORS.danger, fontWeight: "500", flex: 1 },

  // BỘ LỌC ĐỘNG STYLES
  filterSectionContainer: {
    position: "absolute",
    top: 60,
    left: 15,
    right: 15,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 999,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterRowLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    width: 70,
  },
  filterPillScroll: {
    paddingRight: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  filterPillTextActive: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  sortBtnGroup: {
    flexDirection: "row",
    flex: 1,
    gap: 8,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortBtnText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  sortBtnTextActive: {
    color: COLORS.white,
    fontWeight: "bold",
  },
});
