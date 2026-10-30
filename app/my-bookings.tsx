import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const STATUS: Record<string, { label: string; color: string; icon: string }> = {
  Pending: { label: "قيد المراجعة", color: "#E6A700", icon: "time-outline" },
  Confirmed: {
    label: "مؤكد",
    color: "#2EBD85",
    icon: "checkmark-circle-outline",
  },
  Rejected: { label: "مرفوض", color: "#F05A5A", icon: "close-circle-outline" },
  Cancelled: { label: "ملغي", color: "#9299A3", icon: "ban-outline" },
  Done: { label: "مكتمل", color: "#6F9CFF", icon: "checkmark-done-outline" },
  Blocked: { label: "محظور", color: "#F05A5A", icon: "ban-outline" },
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      setErrorMessage("");
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setBookings([]);
        setErrorMessage("يرجى تسجيل الدخول لعرض وتتبع مواعيدك.");
        router.replace("/" as any);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, created_at, booking_date, booking_time, service, barber_name, status",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      setErrorMessage(error.message || "تعذر جلب الحجوزات في الوقت الحالي.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const refresh = () => {
    setRefreshing(true);
    void loadBookings();
  };

  const cancelBooking = (booking: any) => {
    Alert.alert(
      "إلغاء الموعد",
      "هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟ ستتم استعادة توفر الموعد تلقائياً.",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "تأكيد الإلغاء",
          style: "destructive",
          onPress: async () => {
            const id = String(booking.id);
            setCancellingId(id);
            try {
              const { error } = await (supabase as any).rpc(
                "cancel_my_booking",
                { p_booking_id: id },
              );
              if (error) throw error;
              await loadBookings();
              Alert.alert("تم الإلغاء", "تم إلغاء الموعد بنجاح.");
            } catch (error: any) {
              Alert.alert(
                "تعذر الإلغاء",
                error.message || "يرجى المحاولة مرة أخرى.",
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مواعيدي</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color="#CD813E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#CD813E"
          />
        }
      >
        <View style={styles.headingRow}>
          <View style={styles.headingIcon}>
            <Ionicons name="calendar-outline" size={22} color="#CD813E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>سجل الحجوزات</Text>
            <Text style={styles.subtitle}>
              تتبع حالة طلباتك الحالية والمواعيد القادمة.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#CD813E"
            style={{ marginTop: 50 }}
          />
        ) : errorMessage ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={30} color="#E6A700" />
            <Text style={styles.emptyText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={34} color="#777" />
            <Text style={styles.emptyTitle}>لا توجد حجوزات حالياً</Text>
            <Text style={styles.emptyText}>
              عند حجز أي موعد، سيظهر هنا حتى تتم مراجعته واعتماده من طرف المحل.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.replace("/" as any)}
            >
              <Text style={styles.retryText}>تصفح الحلاقين</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((booking) => {
            const status = STATUS[booking.status] || {
              label: booking.status || "غير معروف",
              color: "#9299A3",
              icon: "help-circle-outline",
            };
            const canCancel =
              booking.status === "Pending" || booking.status === "Confirmed";
            const busy = cancellingId === String(booking.id);
            return (
              <View key={String(booking.id)} style={styles.bookingCard}>
                <View style={styles.cardTop}>
                  <View style={styles.barberIcon}>
                    <Ionicons name="cut-outline" size={19} color="#CD813E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.barberName}>
                      {booking.barber_name || "الحلاق"}
                    </Text>
                    <Text style={styles.service}>
                      {booking.service || "خدمة حلاقة"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: `${status.color}20`,
                        borderColor: `${status.color}66`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={status.icon as any}
                      size={14}
                      color={status.color}
                    />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color="#CD813E"
                    />
                    <Text style={styles.detailText}>
                      {booking.booking_date}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={15} color="#CD813E" />
                    <Text style={styles.detailText}>
                      {booking.booking_time}
                    </Text>
                  </View>
                </View>

                {booking.status === "Pending" && (
                  <Text style={styles.pendingHint}>
                    الطلب قيد المراجعة من طرف إدارة المحل. سيتم تأكيد الموعد
                    قريباً.
                  </Text>
                )}
                {booking.status === "Rejected" && (
                  <Text style={styles.rejectedHint}>
                    نعتذر، لم يتم قبول هذا الموعد. يرجى اختيار وقت آخر.
                  </Text>
                )}
                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelBooking(booking)}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons
                        name="close-circle-outline"
                        size={17}
                        color="#FFF"
                      />
                    )}
                    <Text style={styles.cancelText}>إلغاء الموعد</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <Text style={styles.refreshFootnote}>
          يتم تحديث الحالة تلقائياً عند فتح الصفحة أو السحب لأسفل.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0A0A" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#292929",
  },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  content: { padding: 18, paddingBottom: 40 },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  headingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(205,129,62,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#999", fontSize: 12, marginTop: 3 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#292929",
  },
  bookingCard: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#292929",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  barberIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(205,129,62,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  barberName: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  service: { color: "#999", fontSize: 12, marginTop: 3 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: { fontSize: 10, fontWeight: "800" },
  detailsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#DDD", fontSize: 12, fontWeight: "600" },
  pendingHint: {
    color: "#D6A944",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  rejectedHint: {
    color: "#F08080",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  cancelButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#913B3B",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  cancelText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#292929",
    padding: 26,
    marginTop: 20,
  },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", marginTop: 12 },
  emptyText: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: "#CD813E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  refreshFootnote: {
    color: "#777",
    fontSize: 10,
    textAlign: "center",
    marginTop: 18,
  },
});
