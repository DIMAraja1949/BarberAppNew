import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function FollowUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    fetchClientsFollowUp();
  }, []);

  async function fetchClientsFollowUp() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("*");

      if (error) throw error;
      setClients(data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const sendWhatsAppReminder = (
    clientName: string,
    clientPhone: string,
    days: number,
  ) => {
    if (!clientPhone) {
      Alert.alert("تنبيه", "رقم هاتفك غير متوفر لهذا العميل.");
      return;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (days || 10));
    const formattedDate = targetDate.toLocaleDateString("ar-MA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const message = `سلام خويا ${clientName || "العزيز"} ✂️\n\nنتا دوزتي عندنا وبغينا نفكروك بلي ميعاد طراسيك القادم إن شاء الله هو فـ تاريخ: *${formattedDate}*.\n\nنتسناو طلتك عليناه، مرحبا بك ديما فـ المحل! 💈`;

    const formattedPhone = clientPhone.replace(/[^0-9]/g, "");
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert("خطأ", "تطبيق واتساب غير مثبت على هذا الجهاز.");
        } else {
          return Linking.openURL(url);
        }
      })
      .catch((err) => console.error("An error occurred", err));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#CD813E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع مواعيد الزبناء (Follow-Up)</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#CD813E" />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.clientCard}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>
                  {item.name || "زبون بدون اسم"}
                </Text>
                <Text style={styles.clientPhone}>
                  {item.phone || item.email || "لا توجد معلومات اتصال"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() =>
                  sendWhatsAppReminder(
                    item.name,
                    item.phone,
                    item.follow_up_days || 10,
                  )
                }
              >
                <FontAwesome5 name="whatsapp" size={18} color="#fff" />
                <Text style={styles.whatsappText}>تذكير واتساب</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا يوجد زبناء مسجلين حالياً.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(205, 129, 62, 0.2)",
  },
  backButton: { padding: 5 },
  headerTitle: {
    color: "#CD813E",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 15,
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { padding: 20 },
  clientCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(205, 129, 62, 0.3)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientInfo: { flex: 1, alignItems: "flex-end" },
  clientName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  clientPhone: { color: "#888", fontSize: 12 },
  whatsappButton: {
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  whatsappText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
});
