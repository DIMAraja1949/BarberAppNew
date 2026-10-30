import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

// إعداد طريقة ظهور الإشعار متوافقة مع الإصدارات الحديثة
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Success() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const barberName = (params.barberName as string) || "Simo Dayyan";
  const bookingDate = (params.date as string) || "Today";
  const bookingTime = (params.time as string) || "09:30";
  const selectedService =
    (params.selectedService as string) || "Classic Haircut & Beard";

  const [selectedDays, setSelectedDays] = useState<number>(10);

  const daysOptions = [
    { label: "اليوم", value: 1 },
    { label: "5 أيام", value: 5 },
    { label: "10 أيام", value: 10 },
    { label: "14 يوم", value: 14 },
  ];

  const scheduleFollowUpNotification = async (days: number) => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return;
      }

      const secondsTrigger = days * 24 * 60 * 60;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "وقت الحلاقة يا بطل! ✂️💈",
          body: `سلام، دازت المدة اللي اتفقنا عليها (${days} أيام)، مرحبا بك باش طراسي وتعاود تبان أنيق!`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsTrigger,
          repeats: false,
        },
      });
    } catch {}
  };

  const barberWhatsAppNumber = "+212600000000";

  const handleOpenWhatsApp = async () => {
    await scheduleFollowUpNotification(selectedDays);

    const message =
      `سلام عليكم خويا ${barberName}، بغيت أكد الحجز ديالي:%0A` +
      `----------------------------------%0A` +
      `✂️ الخدمة: ${selectedService}%0A` +
      `📅 التاريخ: ${bookingDate}%0A` +
      `⏰ الوقت: ${bookingTime}%0A` +
      `🔄 التتبع القادم: مورا ${selectedDays} أيام%0A` +
      `----------------------------------%0A` +
      `مرحبا، في انتظار تأكيد الموعد!`;

    const url = `https://wa.me/${barberWhatsAppNumber}?text=${message}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening WhatsApp:", err),
    );
  };

  const handleFinishWithoutWhatsApp = async () => {
    await scheduleFollowUpNotification(selectedDays);
    router.replace("/profile" as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={80} color="#CD813E" />
      </View>

      <Text style={styles.successTitle}>Booking Success</Text>
      <Text style={styles.subText}>
        Your appointment has been confirmed. We are waiting for you!
      </Text>

      <View style={styles.detailsBox}>
        <Text style={styles.detailsText} numberOfLines={1}>
          📌 {selectedService}
        </Text>
        <Text style={styles.detailsSubText}>
          📅 {bookingDate} • ⏰ {bookingTime}
        </Text>
      </View>

      <View style={styles.sliderCard}>
        <Text style={styles.sliderLabel}>
          متى تريد أن تحسن مرة أخرى؟ (التتبع)
        </Text>

        <View style={styles.sliderBarContainer}>
          {daysOptions.map((item) => {
            const isSelected = selectedDays === item.value;
            return (
              <Pressable
                key={item.value}
                style={styles.nodeButton}
                onPress={() => setSelectedDays(item.value)}
              >
                <View style={[styles.dot, isSelected && styles.selectedDot]} />
                <Text
                  style={[
                    styles.nodeText,
                    isSelected && styles.selectedNodeText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.whatsappButton} onPress={handleOpenWhatsApp}>
          <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
          <Text style={styles.whatsappButtonText}>Confirm on WhatsApp</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={async () => {
            await scheduleFollowUpNotification(selectedDays);
            // إرسال معلومات الحجز مع الراوتر لصفحة البروفيل مباشرة
            router.push({
              pathname: "/profile",
              params: {
                bookedService: selectedService,
                bookedDate: bookingDate,
                bookedTime: bookingTime,
                remainingDays: selectedDays,
              },
            } as any);
          }}
        >
          <Text style={styles.buttonText}>View My Bookings</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.outlineButton]}
          onPress={handleFinishWithoutWhatsApp}
        >
          <Text style={[styles.buttonText, { color: "#CD813E" }]}>
            Back to Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  iconCircle: {
    marginBottom: 15,
    shadowColor: "#CD813E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  successTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subText: {
    color: "#888",
    fontSize: 13,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 18,
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  detailsText: {
    color: "#CD813E",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailsSubText: {
    color: "#aaa",
    fontSize: 12,
  },
  sliderCard: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(205, 129, 62, 0.4)",
    borderRadius: 14,
    padding: 15,
    marginBottom: 20,
  },
  sliderLabel: {
    color: "#CD813E",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  sliderBarContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  nodeButton: {
    alignItems: "center",
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#555",
    marginBottom: 8,
  },
  selectedDot: {
    backgroundColor: "#CD813E",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },
  nodeText: {
    color: "#777",
    fontSize: 12,
  },
  selectedNodeText: {
    color: "#CD813E",
    fontWeight: "bold",
  },
  footer: {
    width: "100%",
    gap: 10,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  whatsappButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: "#CD813E",
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#CD813E",
    marginBottom: 0,
  },
  buttonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
