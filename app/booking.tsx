import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGuestMode } from "../lib/guestMode";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");

const THEME = {
  colors: {
    primary: "#CD813E",
    bg: "#000",
    cardBg: "rgba(20, 20, 20, 0.8)",
    white: "#FFF",
    text: "#FFF",
    primaryGold: "#FFD700",
    border: "rgba(255, 255, 255, 0.1)",
  },
};

const BookingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { setGuestMode } = useGuestMode();

  const [selectedDateId, setSelectedDateId] = useState("0");
  const [selectedTime, setSelectedTime] = useState("09:30");
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [workingHours, setWorkingHours] = useState({
    start: "09:00",
    end: "21:00",
  });
  const [primaryColor, setPrimaryColor] = useState("#CD813E");

  useEffect(() => {
    AsyncStorage.getItem("primaryColor").then((color) => {
      if (color) setPrimaryColor(color);
    });
  }, []);

  const [selectedService] = useState(
    (params.selectedLook as string) ||
      (params.selectedService as string) ||
      "Classic Haircut & Beard",
  );

  const generateDateList = useMemo(() => {
    const dateList = [];
    const today = new Date();
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dateList.push({
        id: i.toString(),
        day: dayNames[date.getDay()],
        num: date.getDate().toString(),
      });
    }
    return dateList;
  }, []);

  const generateTimeSlots = useMemo(() => {
    const slots = [];
    const startHour = parseInt(workingHours.start.split(":")[0]);
    const endHour = parseInt(workingHours.end.split(":")[0]);

    let hour = startHour;
    let minute = 0;
    while (hour < endHour) {
      slots.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      );
      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    return slots;
  }, [workingHours]);

  const fetchBookedSlots = async () => {
    setAvailabilityLoading(true);
    setAvailabilityError("");
    try {
      const selectedDateObj = generateDateList[parseInt(selectedDateId, 10)];
      if (!selectedDateObj)
        throw new Error("Could not read the selected date.");
      const fullDate = `${selectedDateObj.day}, ${selectedDateObj.num}`;
      const savedHours = await AsyncStorage.getItem("workingHours");
      if (savedHours) setWorkingHours(JSON.parse(savedHours));

      // This RPC returns only busy slot fields; it does not expose other customers' data.
      const { data, error } = await (supabase as any).rpc(
        "get_booking_availability",
        {
          p_booking_date: fullDate,
          p_barber_name: String(params.barberName || "Simo Dayyan"),
        },
      );
      if (error) throw error;
      setBookedSlots(data || []);
    } catch (error: any) {
      setBookedSlots([]);
      setAvailabilityError(
        error.message || "Could not verify available times.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    checkIfFavorite();
    fetchBookedSlots();
  }, [selectedDateId, params.barberName]);

  const checkIfFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favorites");
      if (savedFavorites) {
        const favoritesArray = JSON.parse(savedFavorites);
        setIsFavorite(
          favoritesArray.some((item: any) => item.id === params.barberId),
        );
      }
    } catch (e) {}
  };

  const toggleFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favorites");
      let favoritesArray = savedFavorites ? JSON.parse(savedFavorites) : [];
      if (isFavorite) {
        favoritesArray = favoritesArray.filter(
          (item: any) => item.id !== params.barberId,
        );
        setIsFavorite(false);
      } else {
        favoritesArray.push({
          id: params.barberId,
          name: params.barberName || "Simo Dayyan",
          image: params.barberImage,
        });
        setIsFavorite(true);
      }
      await AsyncStorage.setItem("favorites", JSON.stringify(favoritesArray));
    } catch (e) {}
  };

  const handleConfirm = async () => {
    if (loading) return;
    if (availabilityLoading || availabilityError) {
      Alert.alert(
        "تحقق من الوقت",
        "ما قدرناش نتأكدو من الأوقات المتاحة. عاود جرّب قبل الحجز.",
      );
      return;
    }
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError && userError.name !== "AuthSessionMissingError") {
      Alert.alert("خطأ في الحساب", userError.message);
      return;
    }
    if (!user || userError) {
      Alert.alert(
        "Sign in required",
        "Please sign in or create an account to complete your booking request.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign in",
            onPress: () => {
              setGuestMode(false);
              router.replace("/" as any);
            },
          },
        ],
      );
      return;
    }

    const selectedDateObj = generateDateList[parseInt(selectedDateId, 10)];
    if (!selectedDateObj) {
      Alert.alert("تاريخ غير صالح", "عاود اختار نهار الحجز.");
      return;
    }
    const fullDate = `${selectedDateObj.day}, ${selectedDateObj.num}`;
    const barberName = String(params.barberName || "Simo Dayyan");
    setLoading(true);
    try {
      // Re-check on the server immediately before creating the request to avoid stale slots.
      const { data: latestSlots, error: availabilityError } = await (
        supabase as any
      ).rpc("get_booking_availability", {
        p_booking_date: fullDate,
        p_barber_name: barberName,
      });
      if (availabilityError) throw availabilityError;
      if (
        (latestSlots || []).some(
          (booking: any) => booking.booking_time === selectedTime,
        )
      ) {
        setBookedSlots(latestSlots || []);
        Alert.alert(
          "الوقت غير متاح",
          "هذا الموعد تحجز أو تسدّ للتو. اختار وقتاً آخر.",
        );
        return;
      }

      const { error: bookingError } = await (supabase as any).rpc(
        "create_pending_booking",
        {
          p_booking_date: fullDate,
          p_booking_time: selectedTime,
          p_barber_name: barberName,
          p_service: selectedService,
        },
      );
      if (bookingError) throw bookingError;

      const phoneNumber = "212693222558";
      const message =
        `مرحباً، بغيت نطلب موعد حلاقة 💈:\n\n` +
        `👤 الحلاق: ${barberName}\n` +
        `✂️ الخدمة: ${selectedService}\n` +
        `📅 التاريخ: ${fullDate}\n` +
        `⏰ الوقت: ${selectedTime}\n\n` +
        `حالة الطلب: قيد الانتظار حتى تأكيد المحل.`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      try {
        await Linking.openURL(whatsappUrl);
      } catch {
        Alert.alert(
          "تم تسجيل الطلب",
          "طلبك محفوظ وقيد الانتظار. تقدر تتبع الحالة من صفحة حجوزاتي.",
        );
      }
      router.replace("/my-bookings" as any);
    } catch (error: any) {
      if (
        error.code === "23505" ||
        String(error.message || "").includes("TIME_SLOT_CONFLICT")
      ) {
        setAvailabilityError("");
        await fetchBookedSlots();
        Alert.alert("الوقت غير متاح", "هذا الموعد تحجز للتو. اختار وقتاً آخر.");
      } else {
        Alert.alert(
          "تعذر تسجيل الطلب",
          error.message || "عاود المحاولة من فضلك.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const currentSelectedDate = generateDateList[parseInt(selectedDateId)];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* FIXED HERO SECTION */}
      <View style={styles.fixedHero}>
        <Image
          style={styles.heroImage}
          source={
            params.barberImage
              ? { uri: params.barberImage as string }
              : {
                  uri: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
                }
          }
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)", "rgba(0,0,0,1)"]}
          style={styles.heroOverlay}
        />

        {/* Top Buttons */}
        <View style={[styles.topActions, { top: insets.top + 10 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconCircle}>
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>
          <Pressable onPress={toggleFavorite} style={styles.iconCircle}>
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#FF4B4B" : "#FFF"}
            />
          </Pressable>
        </View>

        {/* Fixed Name and Service (Simplified with Star) */}
        <View style={styles.fixedInfo}>
          <Text style={styles.barberName}>
            {params.barberName || "Simo Dayyan"}
          </Text>
          <View style={[styles.serviceCard, { borderColor: primaryColor }]}>
            <View style={styles.serviceRow}>
              <Ionicons
                name="star"
                size={16}
                color={THEME.colors.primaryGold}
              />
              <Text style={styles.serviceName}>{selectedService}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: height * 0.45,
          paddingBottom: 150,
        }}
      >
        <View style={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
          >
            {generateDateList.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedDateId(item.id)}
                style={[
                  styles.dateBtn,
                  selectedDateId === item.id && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selectedDateId === item.id && { color: "#FFF" },
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateNum,
                    selectedDateId === item.id && { color: "#FFF" },
                  ]}
                >
                  {item.num}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Select Time</Text>
          {availabilityLoading && (
            <View style={styles.availabilityNotice}>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={styles.availabilityNoticeText}>
                Checking available times…
              </Text>
            </View>
          )}
          {!!availabilityError && (
            <Pressable
              onPress={fetchBookedSlots}
              style={styles.availabilityError}
            >
              <Text style={styles.availabilityErrorText}>
                Could not verify times. Tap to retry.
              </Text>
            </Pressable>
          )}
          <View style={styles.timeGrid}>
            {generateTimeSlots.map((time) => {
              const isAdminBlocked = bookedSlots.some(
                (booking) =>
                  booking.booking_time === time &&
                  booking.status === "Blocked" &&
                  booking.barber_name === "ADMIN_BLOCK",
              );
              const isUnavailable =
                availabilityLoading ||
                !!availabilityError ||
                bookedSlots.some((booking) => booking.booking_time === time);
              return (
                <Pressable
                  key={time}
                  onPress={() => !isUnavailable && setSelectedTime(time)}
                  disabled={isUnavailable}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isAdminBlocked
                      ? `${time}, locked by the shop`
                      : `${time}${isUnavailable ? ", unavailable" : ""}`
                  }
                  style={[
                    styles.timeBtn,
                    selectedTime === time &&
                      !isUnavailable && {
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                      },
                    isAdminBlocked
                      ? styles.timeBtnBlocked
                      : isUnavailable && styles.timeBtnFull,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time &&
                        !isUnavailable && { color: "#FFF" },
                      isAdminBlocked && styles.lockedTimeText,
                      isUnavailable && !isAdminBlocked && { color: "#FF4B4B" },
                    ]}
                  >
                    {time}
                  </Text>
                  {isAdminBlocked ? (
                    <View style={styles.lockedIndicator}>
                      <Ionicons name="lock-closed" size={10} color="#FFC107" />
                      <Text style={styles.lockedText}>Closed</Text>
                    </View>
                  ) : availabilityError ? (
                    <Text style={styles.fullText}>Check</Text>
                  ) : isUnavailable ? (
                    <Text style={styles.fullText}>Full</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* FLOATING FOOTER */}
      <View style={[styles.footerWrapper, { bottom: insets.bottom + 20 }]}>
        <BlurView intensity={100} tint="dark" style={styles.footerBlur}>
          <View style={styles.footerContent}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerLabel}>Slot & Style</Text>
              <Text style={styles.footerValue}>
                {currentSelectedDate?.day} {currentSelectedDate?.num} •{" "}
                {selectedTime}
              </Text>
            </View>
            <Pressable
              onPress={handleConfirm}
              disabled={loading || availabilityLoading || !!availabilityError}
              style={({ pressed }) => [
                styles.bookBtn,
                {
                  backgroundColor: primaryColor,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.bookBtnText}>Request booking</Text>
              )}
            </Pressable>
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fixedHero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    zIndex: 10,
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFill },
  topActions: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  fixedInfo: { position: "absolute", bottom: 20, left: 24, right: 24 },
  barberName: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  serviceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
  },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  serviceName: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 25,
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateScroll: { marginBottom: 5 },
  dateBtn: {
    width: 65,
    height: 85,
    borderRadius: 20,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateDay: { fontSize: 11, color: "#777", fontWeight: "700", marginBottom: 4 },
  dateNum: { fontSize: 20, color: "#FFF", fontWeight: "900" },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  availabilityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  availabilityNoticeText: { color: "#AAA", fontSize: 12 },
  availabilityError: {
    backgroundColor: "rgba(244,67,54,0.12)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  availabilityErrorText: {
    color: "#FF8A80",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  timeBtn: {
    width: (width - 48 - 20) / 3,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  timeBtnFull: {
    borderColor: "rgba(255, 75, 75, 0.2)",
    backgroundColor: "rgba(255, 75, 75, 0.03)",
  },
  timeBtnBlocked: {
    borderColor: "rgba(255, 193, 7, 0.45)",
    backgroundColor: "rgba(255, 193, 7, 0.06)",
  },
  timeText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  lockedTimeText: { color: "#FFC107" },
  lockedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  lockedText: { color: "#FFC107", fontSize: 9, fontWeight: "800" },
  fullText: { color: "#FF4B4B", fontSize: 9, fontWeight: "800", marginTop: 1 },
  footerWrapper: { position: "absolute", left: 20, right: 20, zIndex: 100 },
  footerBlur: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingLeft: 18,
  },
  footerInfo: { flex: 1 },
  footerLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  footerValue: { color: "#FFF", fontSize: 14, fontWeight: "900", marginTop: 1 },
  bookBtn: {
    height: 52,
    paddingHorizontal: 22,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bookBtnText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
});

export default BookingScreen;
