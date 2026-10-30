import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [primaryColor, setPrimaryColor] = useState("#CD813E");
  const [activeTab, setActiveTab] = useState("bookings"); // 'bookings', 'schedule', 'customers', 'prices', or 'banners'
  const [banners, setBanners] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [barbersList, setBarbersList] = useState<any[]>([]);
  const [contentReports, setContentReports] = useState<any[]>([]);
  const [contentReportsError, setContentReportsError] = useState("");
  const [workingHours, setWorkingHours] = useState({
    start: "09:00",
    end: "21:00",
  });
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockDateInput, setBlockDateInput] = useState("");
  const [blockTimeInput, setBlockTimeInput] = useState("14:30");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    revenue: 0,
  });

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Load Theme
      const savedColor = await AsyncStorage.getItem("primaryColor");
      if (savedColor) setPrimaryColor(savedColor);

      // 1. Fetch all bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      // 2. Fetch all profiles to map them manually (prevents join errors)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, phone");

      // Create a map for easy lookup
      const profileMap: any = {};
      if (profilesData) {
        profilesData.forEach((p) => {
          profileMap[p.id] = p;
        });
      }

      // Match at-home request contact/location details to the pending booking.
      const { data: homeRequestsData, error: homeRequestsError } = await (
        supabase as any
      )
        .from("home_requests")
        .select("booking_id, phone, address, notes");
      if (homeRequestsError)
        console.warn(
          "Could not load at-home request details:",
          homeRequestsError.message,
        );
      const homeRequestMap: any = {};
      (homeRequestsData || []).forEach((request: any) => {
        if (request.booking_id)
          homeRequestMap[String(request.booking_id)] = request;
      });

      // 3. Combine data
      const enrichedBookings = (bookingsData || []).map((b) => ({
        ...b,
        profiles: profileMap[b.user_id] || null,
        homeRequest: homeRequestMap[String(b.id)] || null,
      }));

      setBookings(enrichedBookings);
      setCustomers(profilesData || []);

      // Fetch Barbers for Price management
      const { data: barbersData } = await supabase.from("barbers").select("*");
      if (barbersData) setBarbersList(barbersData);

      // Fetch Promo Banners
      const { data: bannersData } = await supabase
        .from("promo_banners")
        .select("*")
        .order("created_at", { ascending: false });
      if (bannersData) setBanners(bannersData);

      try {
        const { data: reportsData, error: reportsError } = await supabase
          .from("content_reports")
          .select("*")
          .order("created_at", { ascending: true });
        if (reportsError) throw reportsError;
        setContentReports(reportsData || []);
        setContentReportsError("");
      } catch (error: any) {
        setContentReports([]);
        setContentReportsError(
          error.message || "Could not load the moderation queue.",
        );
      }

      // Calculate Stats
      const total = enrichedBookings.length;
      const completed = enrichedBookings.filter(
        (b: any) => b.status === "Done",
      ).length;
      const pending = enrichedBookings.filter(
        (b: any) => b.status === "Pending",
      ).length;
      const revenue = completed * 40;

      setStats({ total, pending, completed, revenue });

      // Load Working Hours from Supabase first
      const { data: settingsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "working_hours")
        .single();

      if (settingsData?.value) {
        setWorkingHours(settingsData.value);
        await AsyncStorage.setItem(
          "workingHours",
          JSON.stringify(settingsData.value),
        );
      } else {
        // Fallback to local storage if not in Supabase
        const savedHours = await AsyncStorage.getItem("workingHours");
        if (savedHours) setWorkingHours(JSON.parse(savedHours));
      }
    } catch (error: any) {
      Alert.alert("خطأ", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const updateContentReportStatus = async (
    reportId: number,
    status: "reviewed" | "actioned" | "dismissed",
  ) => {
    try {
      const { error } = await supabase
        .from("content_reports")
        .update({ status })
        .eq("id", reportId);
      if (error) throw error;
      setContentReports((reports) =>
        reports.map((report) =>
          report.id === reportId ? { ...report, status } : report,
        ),
      );
    } catch (error: any) {
      Alert.alert(
        "Could not update report",
        error.message || "Please try again.",
      );
    }
  };

  const updateBookingStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any).rpc(
        "admin_set_booking_status",
        {
          p_booking_id: String(id),
          p_new_status: newStatus,
        },
      );
      if (error) throw error;
      await fetchAdminData();
      Alert.alert("تم تحديث الحجز", "تبدلات حالة الحجز بنجاح.");
    } catch (error: any) {
      Alert.alert("خطأ", error.message || "ما قدرناش نبدلو حالة الحجز.");
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);

      if (error) throw error;
      fetchAdminData(); // Refresh list
      Alert.alert("نجاح", "تم حذف الحجز بنجاح");
    } catch (error: any) {
      Alert.alert("خطأ", error.message);
    }
  };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert("تنبيه", "رقم الهاتف غير متوفر");
  };

  const saveWorkingHours = async () => {
    try {
      // 1. Save locally for immediate UI update
      await AsyncStorage.setItem("workingHours", JSON.stringify(workingHours));

      // 2. Save to Supabase so clients can see it
      // We use a 'settings' table with a key 'working_hours'
      const { error } = await supabase.from("settings").upsert(
        {
          key: "working_hours",
          value: workingHours,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

      if (error) {
        console.warn(
          "Supabase settings error (ignore if table not exists):",
          error.message,
        );
      }

      Alert.alert("نجاح", "تم حفظ أوقات العمل بنجاح");
    } catch (e: any) {
      Alert.alert("خطأ", "فشل حفظ البيانات: " + e.message);
    }
  };

  const blockSlot = async (date: string, time: string) => {
    try {
      const user = (await supabase.auth.getSession()).data.session?.user;
      const { error } = await supabase.from("bookings").insert([
        {
          user_id: user?.id,
          barber_name: "ADMIN_BLOCK",
          booking_date: date,
          booking_time: time,
          service: "مغلق (Blocked)",
          status: "Blocked",
        },
      ]);
      if (error) throw error;
      fetchAdminData();
      Alert.alert("نجاح", "تم إغلاق الموعد بنجاح");
    } catch (error: any) {
      Alert.alert("خطأ", error.message);
    }
  };

  const promptBlockSlot = () => {
    const today = new Date();
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    setBlockDateInput(`${dayNames[today.getDay()]}, ${today.getDate()}`);
    setBlockTimeInput("14:30");
    setBlockModalVisible(true);
  };

  const saveBlockedSlot = () => {
    const date = blockDateInput
      .trim()
      .toUpperCase()
      .replace(/\s*,\s*/g, ", ");
    const time = blockTimeInput.trim();
    if (!/^(SUN|MON|TUE|WED|THU|FRI|SAT), ([1-9]|[12]\d|3[01])$/.test(date)) {
      Alert.alert("تاريخ غير صالح", "اكتب التاريخ بصيغة مثل: TUE, 29");
      return;
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time) || !/(00|30)$/.test(time)) {
      Alert.alert("وقت غير صالح", "اكتب الوقت بصيغة HH:00 أو HH:30، مثل 14:30");
      return;
    }
    setBlockModalVisible(false);
    blockSlot(date, time);
  };
  const renderBookingItem = (item: any) => {
    const isBlocked = item.status === "Blocked";
    const statusMap: Record<string, { label: string; color: string }> = {
      Pending: { label: "قيد الانتظار", color: "#FFC107" },
      Confirmed: { label: "مؤكد", color: "#2EBD85" },
      Rejected: { label: "مرفوض", color: "#F05A5A" },
      Cancelled: { label: "ملغي", color: "#9299A3" },
      Done: { label: "مكتمل", color: "#6F9CFF" },
      Blocked: { label: "مغلق", color: "#888888" },
    };
    const statusInfo = statusMap[item.status] || {
      label: item.status || "غير معروف",
      color: "#AAAAAA",
    };
    const customerPhone = item.homeRequest?.phone || item.profiles?.phone;

    return (
      <View
        key={item.id}
        style={[
          styles.bookingCard,
          isBlocked && {
            backgroundColor: "#1A1A1A",
            borderColor: "#333",
            opacity: 0.9,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            {isBlocked ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="lock-closed" size={18} color="#888" />
                <Text style={[styles.clientName, { color: "#888" }]}>
                  موعد مغلق (إدارة)
                </Text>
              </View>
            ) : (
              <Text style={styles.clientName}>
                {item.profiles?.name ||
                  item.profiles?.email ||
                  item.user_id?.substring(0, 8) ||
                  "زبون المحل"}
              </Text>
            )}
            <Text
              style={[
                styles.serviceText,
                { color: isBlocked ? "#666" : primaryColor },
              ]}
            >
              {isBlocked
                ? "تم إغلاق هذا الوقت أمام الزبائن"
                : item.service || item.barber_name}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isBlocked ? "#333" : `${statusInfo.color}25` },
            ]}
          >
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {isBlocked ? "مغلق" : statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={primaryColor} />
            <Text style={styles.detailText}>{item.booking_date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={primaryColor} />
            <Text style={styles.detailText}>{item.booking_time}</Text>
          </View>
        </View>

        {!isBlocked && customerPhone && (
          <TouchableOpacity
            style={styles.phoneRow}
            onPress={() => handleCall(customerPhone)}
          >
            <Ionicons name="call-outline" size={14} color="#888" />
            <Text style={styles.phoneText}>{customerPhone}</Text>
          </TouchableOpacity>
        )}
        {!isBlocked && item.homeRequest?.address && (
          <View style={styles.homeAddressRow}>
            <Ionicons name="location-outline" size={15} color="#CD813E" />
            <Text style={styles.homeAddressText}>
              {item.homeRequest.address}
            </Text>
          </View>
        )}
        {!isBlocked && item.homeRequest?.notes && (
          <Text style={styles.homeNotesText} numberOfLines={3}>
            {item.homeRequest.notes}
          </Text>
        )}

        <View style={styles.cardActions}>
          {isBlocked ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#444", flex: 1 }]}
              onPress={() => {
                Alert.alert(
                  "إعادة فتح",
                  "هل تريد إعادة فتح هذا الموعد للزبائن؟",
                  [
                    { text: "تراجع", style: "cancel" },
                    {
                      text: "فتح الموعد",
                      onPress: () => deleteBooking(item.id),
                    },
                  ],
                );
              }}
            >
              <Ionicons name="lock-open-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>إلغاء الإغلاق (فتح)</Text>
            </TouchableOpacity>
          ) : (
            <>
              {item.status === "Pending" && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#258A5E" }]}
                    onPress={() => updateBookingStatus(item.id, "Confirmed")}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.actionBtnText}>تأكيد</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#A83C3C" }]}
                    onPress={() =>
                      Alert.alert(
                        "رفض الطلب",
                        "واش متأكد بغيتي ترفض هاد الموعد؟ غادي يرجع الوقت متاحاً.",
                        [
                          { text: "رجوع", style: "cancel" },
                          {
                            text: "رفض",
                            style: "destructive",
                            onPress: () =>
                              updateBookingStatus(item.id, "Rejected"),
                          },
                        ],
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.actionBtnText}>رفض</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.status === "Confirmed" && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#258A5E" }]}
                    onPress={() => updateBookingStatus(item.id, "Done")}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>إتمام</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#A83C3C" }]}
                    onPress={() =>
                      Alert.alert(
                        "إلغاء الموعد",
                        "واش متأكد بغيتي تلغي الموعد المؤكد؟",
                        [
                          { text: "رجوع", style: "cancel" },
                          {
                            text: "إلغاء",
                            style: "destructive",
                            onPress: () =>
                              updateBookingStatus(item.id, "Cancelled"),
                          },
                        ],
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.actionBtnText}>إلغاء</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#444" }]}
                onPress={() => {
                  Alert.alert("حذف", "هل أنت متأكد من حذف هذا الحجز نهائياً؟", [
                    { text: "تراجع", style: "cancel" },
                    {
                      text: "حذف نهائي",
                      onPress: () => deleteBooking(item.id),
                      style: "destructive",
                    },
                  ]);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>مسح</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "لوحة التحكم (Admin)",
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#FFF",
          headerTitleStyle: { fontWeight: "bold" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={primaryColor} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
      >
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "bookings" && {
              borderBottomColor: primaryColor,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("bookings")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "bookings" && { color: primaryColor },
            ]}
          >
            الحجوزات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "schedule" && {
              borderBottomColor: primaryColor,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("schedule")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "schedule" && { color: primaryColor },
            ]}
          >
            إدارة الوقت
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "customers" && {
              borderBottomColor: primaryColor,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("customers")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "customers" && { color: primaryColor },
            ]}
          >
            الزبائن
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "prices" && {
              borderBottomColor: primaryColor,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("prices")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "prices" && { color: primaryColor },
            ]}
          >
            الأسعار
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "banners" && {
              borderBottomColor: primaryColor,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("banners")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "banners" && { color: primaryColor },
            ]}
          >
            العروض
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "moderation" && {
              borderBottomColor: primaryColor,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("moderation")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "moderation" && { color: primaryColor },
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
          />
        }
      >
        {activeTab === "moderation" ? (
          <View style={{ padding: 20 }}>
            <Text style={styles.sectionTitle}>UGC moderation queue</Text>
            <Text style={{ color: "#AAA", fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 }}>
              Review new reports within 24 hours. New reports are stored in the
              database queue and emit a backend moderation notification.
            </Text>
            {!!contentReportsError && (
              <Text style={{ color: "#F99", marginBottom: 14 }}>
                Moderation queue unavailable: {contentReportsError}
              </Text>
            )}
            {contentReports.length === 0 ? (
              <Text style={{ color: "#888", textAlign: "center", marginTop: 30 }}>
                No reports waiting for review.
              </Text>
            ) : (
              contentReports.map((report) => (
                <View
                  key={report.id}
                  style={{
                    backgroundColor: "#111",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#333",
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ color: primaryColor, fontWeight: "700", textTransform: "uppercase" }}>
                      {report.content_type.replace("_", " ")}
                    </Text>
                    <Text style={{ color: report.status === "pending" ? "#FFC107" : "#AAA", fontSize: 12 }}>
                      {report.status}
                    </Text>
                  </View>
                  <Text style={{ color: "#DDD", marginTop: 10, lineHeight: 20 }}>
                    {report.reason}
                  </Text>
                  <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>
                    Content: {report.target_content_id}
                    {report.reported_user_id
                      ? ` · User: ${report.reported_user_id}`
                      : ""}
                  </Text>
                  <Text style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
                    Submitted: {new Date(report.created_at).toLocaleString()}
                  </Text>
                  {report.status === "pending" && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                      {(
                        [
                          ["reviewed", "Mark reviewed"],
                          ["actioned", "Take action"],
                          ["dismissed", "Dismiss"],
                        ] as const
                      ).map(([status, label]) => (
                        <TouchableOpacity
                          key={status}
                          style={{
                            backgroundColor:
                              status === "actioned" ? "#8D2E2E" : "#333",
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 9,
                          }}
                          onPress={() =>
                            updateContentReportStatus(report.id, status)
                          }
                        >
                          <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        ) : activeTab === "banners" ? (
          <View style={{ padding: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#FFF" }}>
                إدارة العروض والبانرات
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: primaryColor,
                  paddingHorizontal: 15,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        "إضافة عروض جديدة",
                        "أدخل عنوان العرض (مثلاً: خصم 20%):",
                        [
                          { text: "تراجع", style: "cancel" },
                          {
                            text: "التالي",
                            onPress: (title?: string) => {
                              if (!title) return;
                              Alert.prompt(
                                "رابط الصورة",
                                "أدخل رابط الصورة (URL):",
                                [
                                  { text: "تراجع", style: "cancel" },
                                  {
                                    text: "إضافة",
                                    onPress: async (imgUrl?: string) => {
                                      if (!imgUrl) return;
                                      const { error } = await supabase
                                        .from("promo_banners")
                                        .insert([
                                          {
                                            title,
                                            subtitle: "عرض لفترة محدودة",
                                            image_url: imgUrl,
                                          },
                                        ]);
                                      if (error)
                                        Alert.alert("خطأ", error.message);
                                      else {
                                        Alert.alert(
                                          "نجاح",
                                          "تمت إضافة البانر بنجاح",
                                        );
                                        fetchAdminData();
                                      }
                                    },
                                  },
                                ],
                                "plain-text",
                                "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000",
                              );
                            },
                          },
                        ],
                        "plain-text",
                        "خصم خاص",
                      )
                    : Alert.alert(
                        "ملاحظة",
                        "خاصية الإدخال غير متوفرة، يرجى إضافة البيانات مباشرة من قاعدة البيانات",
                      );
                }}
              >
                <Text style={{ color: "#000", fontWeight: "bold" }}>
                  + إضافة بانر
                </Text>
              </TouchableOpacity>
            </View>

            {banners.length === 0 ? (
              <Text
                style={{ color: "#888", textAlign: "center", marginTop: 40 }}
              >
                لا توجد عروض حالياً
              </Text>
            ) : (
              banners.map((banner) => (
                <View
                  key={banner.id}
                  style={{
                    backgroundColor: "#1C1C1E",
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 15,
                    borderWidth: 1,
                    borderColor: "#333",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontSize: 16,
                      fontWeight: "bold",
                      marginBottom: 5,
                    }}
                  >
                    {banner.title}
                  </Text>
                  <Text
                    style={{ color: "#AAA", fontSize: 13, marginBottom: 10 }}
                  >
                    {banner.subtitle || "عرض خاص"}
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#F44336",
                      padding: 8,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                    onPress={async () => {
                      Alert.alert("حذف", "هل أنت متأكد من حذف هذا العرض؟", [
                        { text: "تراجع", style: "cancel" },
                        {
                          text: "حذف",
                          style: "destructive",
                          onPress: async () => {
                            const { error } = await supabase
                              .from("promo_banners")
                              .delete()
                              .eq("id", banner.id);
                            if (error) Alert.alert("خطأ", error.message);
                            else fetchAdminData();
                          },
                        },
                      ]);
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                      حذف البانر
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : activeTab === "bookings" ? (
          <>
            {/* Stats Section */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <View style={styles.statIconBg}>
                  <Ionicons name="calendar" size={20} color={primaryColor} />
                </View>
                <Text style={styles.statLabel}>إجمالي الحجوزات</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>

              <View style={styles.statBox}>
                <View
                  style={[
                    styles.statIconBg,
                    { backgroundColor: "rgba(76, 175, 80, 0.1)" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={20}
                    color="#4CAF50"
                  />
                </View>
                <Text style={styles.statLabel}>الأرباح التقديرية</Text>
                <Text style={[styles.statValue, { color: "#4CAF50" }]}>
                  {stats.revenue} MAD
                </Text>
              </View>

              <View style={styles.statBox}>
                <View
                  style={[
                    styles.statIconBg,
                    { backgroundColor: "rgba(255, 193, 7, 0.1)" },
                  ]}
                >
                  <Ionicons name="time" size={20} color="#FFC107" />
                </View>
                <Text style={styles.statLabel}>في الانتظار</Text>
                <Text style={[styles.statValue, { color: "#FFC107" }]}>
                  {stats.pending}
                </Text>
              </View>

              <View style={styles.statBox}>
                <View
                  style={[
                    styles.statIconBg,
                    { backgroundColor: "rgba(33, 150, 243, 0.1)" },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                </View>
                <Text style={styles.statLabel}>المكتملة</Text>
                <Text style={[styles.statValue, { color: "#2196F3" }]}>
                  {stats.completed}
                </Text>
              </View>
            </View>

            {/* Bookings Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>الحجوزات الأخيرة</Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={fetchAdminData}
              >
                <Ionicons name="refresh" size={18} color={primaryColor} />
                <Text style={[styles.refreshText, { color: primaryColor }]}>
                  تحديث
                </Text>
              </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
              <ActivityIndicator
                size="large"
                color={primaryColor}
                style={{ marginTop: 40 }}
              />
            ) : bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <BlurView intensity={20} tint="dark" style={styles.emptyBlur}>
                  <Ionicons name="calendar-outline" size={50} color="#333" />
                  <Text style={styles.emptyText}>لا توجد حجوزات حالياً</Text>
                </BlurView>
              </View>
            ) : (
              bookings.map((item) => renderBookingItem(item))
            )}
          </>
        ) : activeTab === "prices" ? (
          <View style={styles.scheduleSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                إدارة أثمنة الحلاقين والخدمات
              </Text>
            </View>
            {barbersList.length === 0 ? (
              <Text
                style={{ color: "#888", textAlign: "center", marginTop: 20 }}
              >
                لا توجد بيانات حلاقين حالياً
              </Text>
            ) : (
              barbersList.map((barber) => (
                <View
                  key={barber.id}
                  style={[
                    styles.configCard,
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#FFF",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      {barber.name}
                    </Text>
                    <Text
                      style={{
                        color: primaryColor,
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      الثمن الحالي: {barber.price || "40 MAD"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor: primaryColor,
                        paddingHorizontal: 15,
                        paddingVertical: 8,
                        marginTop: 0,
                      },
                    ]}
                    onPress={() => {
                      Alert.prompt(
                        "تعديل الثمن",
                        `أدخل الثمن الجديد لـ ${barber.name} (مثال: 50 MAD):`,
                        [
                          { text: "إلغاء", style: "cancel" },
                          {
                            text: "حفظ",
                            onPress: async (newPrice?: string) => {
                              if (!newPrice) return;
                              try {
                                const { error } = await supabase
                                  .from("barbers")
                                  .update({ price: newPrice })
                                  .eq("id", barber.id);
                                if (error) throw error;
                                Alert.alert("نجاح", "تم تحديث الثمن بنجاح");
                                fetchAdminData();
                              } catch (e: any) {
                                Alert.alert("خطأ", e.message);
                              }
                            },
                          },
                        ],
                        "plain-text",
                        barber.price || "40 MAD",
                      );
                    }}
                  >
                    <Text style={styles.saveBtnText}>تعديل الثمن</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : activeTab === "schedule" ? (
          <View style={styles.scheduleSection}>
            <View style={styles.configCard}>
              <Text style={styles.cardTitle}>أوقات العمل اليومية</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.inputLabel}>وقت الفتح</Text>
                  <TouchableOpacity
                    style={styles.timePickerBtn}
                    onPress={() => {
                      Alert.prompt(
                        "تعديل وقت الفتح",
                        "أدخل الوقت (مثال: 08:00)",
                        [
                          { text: "إلغاء" },
                          {
                            text: "حفظ",
                            onPress: (val: string | undefined) =>
                              val &&
                              setWorkingHours((prev) => ({
                                ...prev,
                                start: val,
                              })),
                          },
                        ],
                        "plain-text",
                        workingHours.start,
                      );
                    }}
                  >
                    <Text style={styles.timePickerText}>
                      {workingHours.start}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#333"
                  style={{ marginTop: 20 }}
                />
                <View style={styles.timeInputGroup}>
                  <Text style={styles.inputLabel}>وقت الإغلاق</Text>
                  <TouchableOpacity
                    style={styles.timePickerBtn}
                    onPress={() => {
                      Alert.prompt(
                        "تعديل وقت الإغلاق",
                        "أدخل الوقت (مثال: 22:00)",
                        [
                          { text: "إلغاء" },
                          {
                            text: "حفظ",
                            onPress: (val: string | undefined) =>
                              val &&
                              setWorkingHours((prev) => ({
                                ...prev,
                                end: val,
                              })),
                          },
                        ],
                        "plain-text",
                        workingHours.end,
                      );
                    }}
                  >
                    <Text style={styles.timePickerText}>
                      {workingHours.end}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: primaryColor }]}
                onPress={saveWorkingHours}
              >
                <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.configCard}>
              <Text style={styles.cardTitle}>إغلاق موعد محدد</Text>
              <Text style={styles.cardDesc}>
                يمكنك إغلاق ساعة معينة لمنع الزبائن من الحجز فيها.
              </Text>

              <View style={styles.quickBlockRow}>
                <TouchableOpacity
                  style={styles.blockBtn}
                  onPress={promptBlockSlot}
                >
                  <Ionicons name="lock-closed" size={18} color="#FFF" />
                  <Text style={styles.blockBtnText}>إغلاق وقت الآن</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.scheduleSection}>
            <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>
              قائمة الزبائن المسجلين ({customers.length})
            </Text>
            {customers.length === 0 ? (
              <View style={styles.emptyState}>
                <BlurView intensity={20} tint="dark" style={styles.emptyBlur}>
                  <Ionicons name="people-outline" size={50} color="#333" />
                  <Text style={styles.emptyText}>لا توجد حسابات مسجلة بعد</Text>
                </BlurView>
              </View>
            ) : (
              customers.map((cust) => (
                <View key={cust.id} style={styles.bookingCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>
                        {cust.name || "زبون بدون اسم"}
                      </Text>
                      <Text
                        style={[styles.serviceText, { color: primaryColor }]}
                      >
                        {cust.email}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${primaryColor}25` },
                      ]}
                      onPress={() => handleCall(cust.phone)}
                    >
                      <Ionicons name="call" size={14} color={primaryColor} />
                    </TouchableOpacity>
                  </View>
                  {cust.phone && (
                    <View style={styles.cardDetails}>
                      <Ionicons name="call-outline" size={14} color="#888" />
                      <Text style={styles.detailText}>{cust.phone}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <Modal
        transparent
        visible={blockModalVisible}
        animationType="fade"
        onRequestClose={() => setBlockModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.blockModalCard}>
            <Text style={styles.cardTitle}>إغلاق موعد</Text>
            <Text style={styles.cardDesc}>
              أدخل التاريخ بنفس الصيغة الظاهرة في الحجز (مثال: TUE, 29).
            </Text>
            <TextInput
              value={blockDateInput}
              onChangeText={setBlockDateInput}
              placeholder="TUE, 29"
              placeholderTextColor="#777"
              autoCapitalize="characters"
              style={styles.blockInput}
              accessibilityLabel="تاريخ الموعد"
            />
            <Text style={[styles.cardDesc, { marginTop: 12, marginBottom: 8 }]}>
              الوقت (مثال: 14:30)
            </Text>
            <TextInput
              value={blockTimeInput}
              onChangeText={setBlockTimeInput}
              placeholder="14:30"
              placeholderTextColor="#777"
              keyboardType="numbers-and-punctuation"
              style={styles.blockInput}
              accessibilityLabel="وقت الموعد"
            />
            <View style={styles.blockModalActions}>
              <TouchableOpacity
                style={[styles.blockModalButton, { backgroundColor: "#333" }]}
                onPress={() => setBlockModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.blockModalButton,
                  { backgroundColor: "#F44336" },
                ]}
                onPress={saveBlockedSlot}
              >
                <Text style={styles.saveBtnText}>إغلاق الموعد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#222",
    elevation: 2,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(205, 129, 62, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: { color: "#888", fontSize: 11, marginBottom: 5 },
  statValue: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  refreshText: { fontSize: 12, fontWeight: "500" },
  bookingCard: {
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  clientName: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  serviceText: { fontSize: 13, marginTop: 3, fontWeight: "500" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "bold" },
  cardDetails: { flexDirection: "row", gap: 15, marginBottom: 10 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#888", fontSize: 12 },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingVertical: 5,
  },
  phoneText: { color: "#888", fontSize: 12, textDecorationLine: "underline" },
  homeAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginBottom: 8,
  },
  homeAddressText: { color: "#CCC", fontSize: 11, lineHeight: 16, flex: 1 },
  homeNotesText: {
    color: "#999",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionBtnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  emptyState: { borderRadius: 24, overflow: "hidden", marginTop: 40 },
  emptyBlur: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "rgba(20,20,20,0.5)",
  },
  emptyText: { color: "#444", fontSize: 14, marginTop: 15, fontWeight: "500" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tabScroll: { flexGrow: 0, backgroundColor: "#000" },
  tab: { minWidth: 88, paddingHorizontal: 10, paddingVertical: 15, alignItems: "center" },
  tabText: { color: "#888", fontSize: 14, fontWeight: "bold" },
  scheduleSection: { gap: 20 },
  configCard: {
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardDesc: { color: "#888", fontSize: 12, marginBottom: 20 },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  timeInputGroup: { flex: 1 },
  inputLabel: { color: "#666", fontSize: 12, marginBottom: 8 },
  timePickerBtn: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  timePickerText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  saveBtn: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold" },
  quickBlockRow: { marginTop: 10 },
  blockBtn: {
    backgroundColor: "#F44336",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 15,
  },
  blockBtnText: { color: "#FFF", fontWeight: "bold" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  blockModalCard: {
    backgroundColor: "#151515",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  blockInput: {
    backgroundColor: "#222",
    borderRadius: 12,
    color: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#383838",
  },
  blockModalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  blockModalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  miniBarberBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#222",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  miniBarberText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});
