import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");

const THEME = {
  colors: {
    primary: "#CD813E",
    bg: "#0B0B0B",
    cardBg: "#141414",
    white: "#FFF",
    text: "#1A1A1A",
    heart: "#FF4B4B",
    primaryGold: "#D4AF37",
    border: "#262626",
  },
};

const BookingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedDateId, setSelectedDateId] = useState("0");
  const [selectedTime, setSelectedTime] = useState("09:30");
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // استقبال الخدمة أو الستايل المختار تلقائياً (Frontend State Sync)
  const [selectedService, setSelectedService] = useState(
    (params.selectedLook as string) || (params.selectedService as string) || "Classic Haircut & Beard"
  );

  useEffect(() => {
    if (params.selectedLook) {
      setSelectedService(params.selectedLook as string);
    }
  }, [params.selectedLook]);

  // 1. الأيام
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

  // 2. السوايع
  const generateTimeSlots = useMemo(() => {
    const slots = [];
    let hour = 9;
    let minute = 0;
    while (hour < 21) {
      slots.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      );
      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    return slots;
  }, []);

  // 3. جلب البيانات من السوبابيس
  const fetchBookedSlots = async () => {
    try {
      const selectedDateObj = generateDateList[parseInt(selectedDateId)];
      const fullDate = `${selectedDateObj.day}, ${selectedDateObj.num}`;

      const { data, error } = await supabase
        .from("bookings")
        .select("booking_time")
        .eq("booking_date", fullDate)
        .eq("barber_name", params.barberName || "Simo Dayyan");

      if (error) throw error;
      setBookedSlots(data ? data.map((b: any) => b.booking_time) : []);
    } catch (e) {
      console.warn("Booking slots unavailable, using empty state:", e);
      setBookedSlots([]);
    }
  };

  useEffect(() => {
    checkIfFavorite();
    fetchBookedSlots();
  }, [selectedDateId]);

  const checkIfFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favorites");
      if (savedFavorites) {
        const favoritesArray = JSON.parse(savedFavorites);
        setIsFavorite(
          favoritesArray.some((item: any) => item.id === params.barberId)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favorites");
      let favoritesArray = savedFavorites ? JSON.parse(savedFavorites) : [];
      if (isFavorite) {
        favoritesArray = favoritesArray.filter(
          (item: any) => item.id !== params.barberId
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      const userId = user ? user.id : "guest-user";

      const selectedDateObj = generateDateList[parseInt(selectedDateId)];
      const fullDate = `${selectedDateObj.day}, ${selectedDateObj.num}`;

      // إدخال الحجز في قاعدة البيانات
      const { error } = await supabase.from("bookings").insert([
        {
          user_id: userId,
          barber_name: params.barberName || "Simo Dayyan",
          booking_date: fullDate,
          booking_time: selectedTime,
          status: "Confirmed",
        },
      ]);

      if (error) throw error;
      
      // فتح الواتساب تلقائياً بالرقم المجدول (0693222558 -> 212693222558)
      const phoneNumber = "212693222558";
      const barberName = (params.barberName as string) || "Simo Dayyan";
      const clientName = user?.email || "زبون المحل";

      const message = `مرحباً، أريد تأكيد حجز جديد 💈:\n\n` +
        `👤 الحلاق: ${barberName}\n` +
        `✂️ الخدمة/الستايل: ${selectedService}\n` +
        `📅 التاريخ: ${fullDate}\n` +
        `⏰ الوقت: ${selectedTime}\n\n` +
        `المرجو تأكيد الموعد، وشكراً!`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert("Error", "WhatsApp is not installed on this device.");
      }

      // التوجيه نحو صفحة success
      router.replace({
        pathname: "/success" as any,
        params: {
          barberName: barberName,
          time: selectedTime,
          date: fullDate,
          selectedService: selectedService,
        },
      });
    } catch (error: any) {
      Alert.alert("Booking Error", error.message || "Something went wrong");
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View style={styles.heroSection}>
          <Image
            style={styles.mainImage}
            source={
              params.barberImage
                ? { uri: params.barberImage as string }
                : { uri: "https://images.pexels.com/photos/1319461/pexels-photo-1319461.jpeg?auto=compress&cs=tinysrgb&w=800" }
            }
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", "rgba(11,11,11,0.95)"]}
            style={styles.overlay}
          />

          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <BlurView intensity={80} tint="dark" style={styles.blurCircle}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </BlurView>
          </Pressable>

          <Pressable style={styles.heartBtn} onPress={toggleFavorite}>
            <BlurView intensity={80} tint="dark" style={styles.blurCircle}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#FF4B4B" : "#fff"}
              />
            </BlurView>
          </Pressable>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.handle} />
          <Text style={styles.title}>{params.barberName || "Simo Dayyan"}</Text>

          <View style={styles.selectedServiceCard}>
            <View style={styles.serviceBadgeRow}>
              <Ionicons name="sparkles" size={14} color={THEME.colors.primaryGold} />
              <Text style={styles.serviceBadgeText}>الستايل المختار (AI Style Sync)</Text>
            </View>
            <Text style={styles.serviceNameText}>{selectedService}</Text>
          </View>

          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateList}
          >
            {generateDateList.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedDateId(item.id)}
                style={[
                  styles.dateBtn,
                  selectedDateId === item.id && styles.dateBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selectedDateId === item.id && styles.whiteText,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateNum,
                    selectedDateId === item.id && styles.whiteText,
                  ]}
                >
                  {item.num}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={styles.timeGrid}>
            {generateTimeSlots.map((time) => {
              const isBooked = bookedSlots.includes(time);
              return (
                <Pressable
                  key={time}
                  onPress={() => !isBooked && setSelectedTime(time)}
                  disabled={isBooked}
                  style={[
                    styles.timeBtn,
                    selectedTime === time && !isBooked && styles.timeBtnActive,
                    isBooked && styles.timeBtnDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time && !isBooked && styles.whiteText,
                      isBooked && styles.disabledText,
                    ]}
                  >
                    {time}
                  </Text>
                  {isBooked && (
                    <Text style={styles.fullText}>Full</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerContainer}>
        <BlurView intensity={90} tint="dark" style={styles.stickyFooter}>
          <View style={styles.footerInner}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.footerLabel}>Selected Slot & Style</Text>
              <Text style={styles.footerValue} numberOfLines={1}>
                {currentSelectedDate ? `${currentSelectedDate.day}, ${currentSelectedDate.num}` : ""} • {selectedTime}
              </Text>
            </View>
            <Pressable
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmText}>Book Now</Text>
              )}
            </Pressable>
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0B" },
  heroSection: { height: height * 0.42, width: "100%", position: "relative" },
  mainImage: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject },
  backBtn: { position: "absolute", top: 50, left: 20, zIndex: 100 },
  heartBtn: { position: "absolute", top: 50, right: 20, zIndex: 100 },
  blurCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  contentCard: {
    backgroundColor: "#0B0B0B",
    marginTop: -35,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 24,
    minHeight: height * 0.6,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 15,
  },
  selectedServiceCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    padding: 14,
    marginBottom: 20,
  },
  serviceBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  serviceBadgeText: { color: "#D4AF37", fontSize: 11, fontWeight: "bold" },
  serviceNameText: { color: "#FFF", fontSize: 15, fontWeight: "800" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 12,
    marginTop: 10,
  },
  dateList: { flexDirection: "row", marginBottom: 15 },
  dateBtn: {
    width: 65,
    height: 85,
    backgroundColor: "#141414",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#262626",
  },
  dateBtnActive: { backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  dateDay: { fontSize: 11, color: "#888", fontWeight: "600", marginBottom: 4 },
  dateNum: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  whiteText: { color: "#0B0B0B" },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeBtn: {
    width: "31%",
    height: 50,
    backgroundColor: "#141414",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#262626",
  },
  timeBtnActive: { backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  timeBtnDisabled: {
    backgroundColor: "#1a1a1a",
    borderColor: "#222",
    opacity: 0.5,
  },
  disabledText: { color: "#666", textDecorationLine: "line-through" },
  timeText: { fontSize: 14, fontWeight: "600", color: "#CCC" },
  fullText: { fontSize: 8, color: "#ff4444", fontWeight: "bold" },

  footerContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    zIndex: 200,
  },
  stickyFooter: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  footerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
  footerValue: { fontSize: 14, fontWeight: "700", color: "#FFF", marginTop: 2 },
  confirmBtn: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 25,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmText: { color: "#0B0B0B", fontSize: 15, fontWeight: "900" },
});

export default BookingScreen;