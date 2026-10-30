import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#CD813E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>سياسة الخصوصية لـ BarberApp</Text>
        <Text style={styles.date}>آخر تحديث: أغسطس 2026</Text>

        <Text style={styles.sectionHeader}>1. جمع المعلومات</Text>
        <Text style={styles.text}>
          نحن نجمع معلومات أساسية مثل اسمك، رقم هاتفك، وتفاصيل المواعيد الخاصة
          بك لتقديم أفضل خدمة حلاقة وتيسير إدارة حجوزاتك معنا.
        </Text>

        <Text style={styles.sectionHeader}>2. استخدام البيانات</Text>
        <Text style={styles.text}>
          تُستخدم بياناتك حصرياً لإدارة المواعيد، إرسال تذكيرات المواعيد عبر
          النظام، وتحسين تجربتك داخل التطبيق عبر قاعدة البيانات المؤمنة
          Supabase.
        </Text>

        <Text style={styles.sectionHeader}>3. أمان وحماية البيانات</Text>
        <Text style={styles.text}>
          نتخذ التدابير التقنية المناسبة لحماية معلوماتك الشخصية ومنع أي وصول
          غير مرخص أو تسريب للبيانات.
        </Text>

        <Text style={styles.sectionHeader}>4. الاتصال بنا</Text>
        <Text style={styles.text}>
          إذا كان لديك أي استفسار بخصوص سياسة الخصوصية، يمكنك التواصل معنا
          مباشرة عبر تطبيق BarberApp.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#161616",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262626",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#CD813E",
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    color: "#888",
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    color: "#AAAAAA",
    lineHeight: 20,
  },
});
