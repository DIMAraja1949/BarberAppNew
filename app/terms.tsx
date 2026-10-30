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

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#CD813E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>BarberApp Terms of Use</Text>
        <Text style={styles.text}>
          By creating an account or using account features, you agree to these
          terms. Guest browsing is available without an account. An account is
          required to book appointments and use features that save activity to
          your profile.
        </Text>

        <Text style={styles.sectionHeader}>Community standards</Text>
        <Text style={styles.text}>
          BarberApp has zero tolerance for objectionable content and abusive
          users. Do not post or send content that is unlawful, threatening,
          hateful, sexually exploitative, harassing, discriminatory, spam, or
          otherwise harmful. You are responsible for content you submit and
          must have the rights needed to share it.
        </Text>

        <Text style={styles.sectionHeader}>Reporting and blocking</Text>
        <Text style={styles.text}>
          Use the report control on a reel or comment to submit it for review.
          You can block an account from its reel; blocked accounts are hidden
          from your device. We review reports and may remove content, restrict
          posting, or suspend accounts that violate these standards.
        </Text>

        <Text style={styles.sectionHeader}>Account and deletion</Text>
        <Text style={styles.text}>
          Keep your sign-in credentials secure and provide accurate account
          details. You may request permanent account deletion from your Profile
          screen. Deletion removes your account and associated personal data,
          subject to records we are legally required to retain.
        </Text>

        <Text style={styles.sectionHeader}>Using the service</Text>
        <Text style={styles.text}>
          Do not interfere with the service, attempt unauthorized access, or
          misuse another person's account. BarberApp may limit access to
          features when needed to protect users or enforce these terms.
        </Text>

        <Text style={styles.sectionHeader}>Contact</Text>
        <Text style={styles.text}>
          Use the in-app report feature for content and conduct concerns. For
          other questions, contact the BarberApp team through the shop's
          published contact details.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0B" },
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
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  headerSpacer: { width: 40 },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#CD813E",
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 20,
    marginBottom: 6,
  },
  text: { fontSize: 13, color: "#AAA", lineHeight: 21 },
});
