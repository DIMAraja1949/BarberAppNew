import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useGuestMode } from "../lib/guestMode";
import { supabase } from "../lib/supabaseClient";

export default function ProfileScreen() {
  const router = useRouter();
  const { guestMode, setGuestMode } = useGuestMode();

  const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);
  const [servicesModalVisible, setServicesModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false);

  const [clientName, setClientName] = useState("الزبون");
  const [clientPhone, setClientPhone] = useState("+212 600-000000");
  const [primaryColor, setPrimaryColor] = useState("#CD813E");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Real Booking State
  const [latestBooking, setLatestBooking] = useState<any>(null);

  const showSignInRequired = () => {
    Alert.alert(
      "Sign in required",
      "Please sign in or create an account to use this profile feature.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign in",
          onPress: () => {
            setGuestMode(false);
            router.replace("/");
          },
        },
      ],
    );
  };

  useEffect(() => {
    const initProfile = async () => {
      try {
        // Get Session & User Profile
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const user = session.user;
          if (user.email === "mohameddayan2@gmail.com") {
            setIsAdmin(true);
          }

          // Fetch profile from Supabase
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, phone, avatar_url")
            .eq("id", user.id)
            .single();

          if (profileData) {
            if (profileData.name) setClientName(profileData.name);
            else if (user.email)
              setClientName(user.email.split("@")[0].toUpperCase());

            if (profileData.phone) setClientPhone(profileData.phone);
            if (profileData.avatar_url) setProfileImage(profileData.avatar_url);
          } else {
            if (user.email)
              setClientName(user.email.split("@")[0].toUpperCase());
          }

          // Fetch latest booking
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (bookingData && bookingData.length > 0) {
            setLatestBooking(bookingData[0]);
          }
        }
      } catch {}
    };
    initProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadTheme = async () => {
        try {
          const savedColor = await AsyncStorage.getItem("primaryColor");
          if (savedColor) setPrimaryColor(savedColor);
        } catch (e) {}
      };
      loadTheme();
    }, []),
  );

  const changeTheme = async (color: string) => {
    if (guestMode) {
      showSignInRequired();
      return;
    }
    setPrimaryColor(color);
    try {
      await AsyncStorage.setItem("primaryColor", color);
    } catch (e) {}
  };

  const pickImage = async () => {
    if (guestMode) {
      showSignInRequired();
      return;
    }
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("يجب منح الإذن للوصول إلى معرض الصور لتغيير الصورة الشخصية!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);

      // Update in Supabase profiles if possible
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("profiles")
          .update({ avatar_url: uri })
          .eq("id", session.user.id);
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (guestMode) {
      showSignInRequired();
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("profiles")
          .update({ name: clientName, phone: clientPhone })
          .eq("id", session.user.id);
      }
      setSettingsModalVisible(false);
      Alert.alert("نجاح", "تم تحديث بيانات الحساب بنجاح");
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "فشل التحديث");
    }
  };

  const [servicesList, setServicesList] = useState([
    { id: "1", name: "Classic Fade & Beard Trim", isFavorite: true },
    { id: "2", name: "Royal Haircut & Hot Towel", isFavorite: false },
    { id: "3", name: "Beard Styling & Shaving", isFavorite: true },
    { id: "4", name: "Kids Haircut", isFavorite: false },
  ]);

  const toggleFavoriteService = (id: string) => {
    if (guestMode) {
      showSignInRequired();
      return;
    }
    setServicesList(
      servicesList.map((s) =>
        s.id === id ? { ...s, isFavorite: !s.isFavorite } : s,
      ),
    );
  };

  const handleSignOut = () => {
    if (guestMode) {
      showSignInRequired();
      return;
    }
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج من التطبيق؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الخروج",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              router.replace("/");
            } catch (error: any) {
              Alert.alert("خطأ", error.message || "حدث خطأ أثناء تسجيل الخروج");
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    if (guestMode) {
      showSignInRequired();
      return;
    }
    setSettingsModalVisible(false);
    setDeleteConfirmationVisible(true);
  };

  const confirmDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;

      setDeleteConfirmationVisible(false);
      let localCleanupWarning = "";
      try {
        await AsyncStorage.multiRemove(["userAvatar", "favorites"]);
      } catch (error: any) {
        localCleanupWarning = error.message || "Could not clear cached profile data.";
      }
      try {
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "local",
        });
        if (signOutError) {
          localCleanupWarning = [
            localCleanupWarning,
            `Could not clear the saved session: ${signOutError.message}.`,
          ]
            .filter(Boolean)
            .join(" ");
        }
      } catch (error: any) {
        localCleanupWarning = [
          localCleanupWarning,
          `Could not clear the saved session: ${error.message || "Please restart the app."}`,
        ]
          .filter(Boolean)
          .join(" ");
      }
      router.replace("/");
      if (localCleanupWarning) {
        Alert.alert(
          "Account deleted",
          `Your account and associated personal data were permanently deleted. ${localCleanupWarning}`,
        );
      } else {
        Alert.alert(
          "Account deleted",
          "Your account and associated personal data have been permanently deleted.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Could not delete account",
        error.message || "Account deletion failed. Please try again.",
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#0B0B0B" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View
                style={[
                  styles.avatarPlaceholder,
                  { borderColor: primaryColor },
                ]}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <FontAwesome5
                    name="user-alt"
                    size={38}
                    color={primaryColor}
                  />
                )}
              </View>
              <View
                style={[styles.editBadge, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="camera" size={14} color="#121212" />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.nameText}>
            {guestMode ? "Guest" : clientName}
          </Text>
          {!isAdmin && !guestMode && (
            <Text style={styles.phoneText}>{clientPhone}</Text>
          )}
          <View
            style={[
              styles.badgeContainer,
              {
                borderColor: primaryColor,
                backgroundColor: `${primaryColor}15`,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={guestMode ? "account-eye-outline" : isAdmin ? "shield-check" : "crown"}
              size={16}
              color={primaryColor}
            />
            <Text style={[styles.badgeText, { color: primaryColor }]}>
              {guestMode
                ? "Guest profile preview"
                : isAdmin
                  ? "أدمن (Admin)"
                  : "زبون ملكي مميز"}
            </Text>
          </View>
        </View>

        {/* Tracking & Next Appointment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={22} color={primaryColor} />
            <Text style={styles.cardTitle}>حجزك الملكي القادم</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${primaryColor}25` },
              ]}
            >
              <Text style={[styles.statusText, { color: primaryColor }]}>
                {guestMode
                  ? "Sign in required"
                  : latestBooking
                    ? latestBooking.status || "مؤكد"
                    : "لا يوجد"}
              </Text>
            </View>
          </View>

          {guestMode ? (
            <View style={styles.appointmentDetails}>
              <Text
                style={{
                  color: "#888",
                  fontSize: 13,
                  textAlign: "center",
                  marginVertical: 10,
                }}
              >
                Sign in to view your booking details.
              </Text>
            </View>
          ) : latestBooking ? (
            <View style={styles.appointmentDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>الموعد:</Text>
                <Text style={styles.detailValue}>
                  {latestBooking.booking_date}، {latestBooking.booking_time}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>الخدمة:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {latestBooking.service || latestBooking.barber_name}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.appointmentDetails}>
              <Text
                style={{
                  color: "#888",
                  fontSize: 13,
                  textAlign: "center",
                  marginVertical: 10,
                }}
              >
                لا يوجد حجز سابق. قم بحجز موعدك الآن!
              </Text>
            </View>
          )}

          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>حالة الطلب:</Text>
              <Text style={[styles.progressTime, { color: primaryColor }]}>
                {guestMode
                  ? "Sign in to view booking status"
                  : latestBooking
                    ? "مفعل ومؤكد"
                    : "جاهز للحجز"}
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: !guestMode && latestBooking ? "100%" : "0%",
                    backgroundColor: primaryColor,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Loyalty & Points */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name="star-face"
              size={26}
              color={primaryColor}
            />
            <Text style={styles.statNumber}>{guestMode ? "—" : "120"}</Text>
            <Text style={styles.statLabel}>نقطة الولاء</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome5 name="history" size={22} color={primaryColor} />
            <Text style={styles.statNumber}>{guestMode ? "—" : "8"}</Text>
            <Text style={styles.statLabel}>الزيارات السابقة</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (guestMode) showSignInRequired();
              else setWhatsappModalVisible(true);
            }}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={styles.menuText}>إشعارات واتساب التلقائية</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (guestMode) showSignInRequired();
              else setServicesModalVisible(true);
            }}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons name="heart-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.menuText}>القصات والخدمات المفضلة</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (guestMode) showSignInRequired();
              else setSettingsModalVisible(true);
            }}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={styles.menuText}>إعدادات الحساب والثيم</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          {/* Privacy Policy Option */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/privacy" as any)}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={styles.menuText}>سياسة الخصوصية (Privacy Policy)</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          {/* Admin Dashboard Option - Only for Admin */}
          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#222",
                  borderBottomWidth: 0,
                },
              ]}
              onPress={() => router.push("/admin-dashboard" as any)}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: `${primaryColor}15` },
                ]}
              >
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text
                style={[
                  styles.menuText,
                  { color: primaryColor, fontWeight: "bold" },
                ]}
              >
                لوحة التحكم (Admin Dashboard)
              </Text>
              <Ionicons name="chevron-forward" size={18} color={primaryColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sign Out Button */}
        {!guestMode && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4D4D" />
            <Text style={styles.signOutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* --- MODALS --- */}
      <Modal
        visible={whatsappModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons
              name="whatsapp"
              size={40}
              color="#25D366"
              style={{ alignSelf: "center", marginBottom: 10 }}
            />
            <Text style={styles.modalTitle}>إشعارات واتساب والتتبع</Text>
            <Text style={styles.modalDescription}>
              النظام مرتبط مباشرة مع حسابك لتذكيرك بموعد الحلاقة القادم عبر
              واتساب وتنبيهات الهاتف لضمان أناقتك المستمرة.
            </Text>
            <View style={styles.modalSettingRow}>
              <Text style={{ color: "#fff", fontSize: 13 }}>
                تفعيل التنبيهات التلقائية
              </Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#333", true: "#25D366" }}
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: primaryColor }]}
              onPress={() => setWhatsappModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>حفظ وإغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={servicesModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="heart"
              size={38}
              color={primaryColor}
              style={{ alignSelf: "center", marginBottom: 10 }}
            />
            <Text style={styles.modalTitle}>القصات والخدمات المفضلة ⭐</Text>
            <Text style={styles.modalSubTitle}>
              اختر خدماتك المفضلة لتظهر مباشرة عند الحجز:
            </Text>

            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {servicesList.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceItemRow}
                  onPress={() => toggleFavoriteService(service.id)}
                >
                  <Text
                    style={{
                      color: service.isFavorite ? "#fff" : "#888",
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    {service.name}
                  </Text>
                  <Ionicons
                    name={service.isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={service.isFavorite ? primaryColor : "#555"}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: primaryColor }]}
              onPress={() => setServicesModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>تأكيد المفضلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={settingsModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="settings"
              size={38}
              color={primaryColor}
              style={{ alignSelf: "center", marginBottom: 10 }}
            />
            <Text style={styles.modalTitle}>إعدادات الحساب والثيم ⚙️</Text>

            <Text style={styles.inputLabel}>تعديل اسم الزبون:</Text>
            <TextInput
              style={styles.textInput}
              value={clientName}
              onChangeText={setClientName}
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>تعديل رقم الهاتف:</Text>
            <TextInput
              style={styles.textInput}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>
              تخصيص لون التطبيق (الثيم):
            </Text>
            <View style={styles.colorPickerRow}>
              {[
                "#CD813E",
                "#E50914",
                "#007AFF",
                "#2ECC71",
                "#9B59B6",
                "#F39C12",
              ].map((colorHex) => (
                <TouchableOpacity
                  key={colorHex}
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: colorHex,
                      borderWidth: primaryColor === colorHex ? 2.5 : 0,
                      borderColor: "#fff",
                    },
                  ]}
                  onPress={() => changeTheme(colorHex)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: primaryColor, marginTop: 15 },
              ]}
              onPress={handleUpdateProfile}
            >
              <Text style={styles.modalButtonText}>حفظ التغييرات</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
              accessibilityRole="button"
              accessibilityLabel="Permanently delete account"
            >
              <Ionicons name="trash-outline" size={19} color="#FF4D4D" />
              <Text style={styles.deleteAccountText}>
                Delete Account · حذف الحساب نهائياً
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmationVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!deletingAccount) setDeleteConfirmationVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="warning-outline"
              size={42}
              color="#FF4D4D"
              style={{ alignSelf: "center", marginBottom: 10 }}
            />
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalDescription}>
              This permanently deletes your account, profile, bookings, home
              visit requests, reels, comments, likes, follows, and uploaded
              profile and reel media. This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteConfirmButton]}
              onPress={confirmDeleteAccount}
              disabled={deletingAccount}
              accessibilityRole="button"
            >
              {deletingAccount ? (
                <Text style={styles.modalButtonText}>Deleting account...</Text>
              ) : (
                <Text style={styles.modalButtonText}>
                  Permanently delete account
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={() => setDeleteConfirmationVisible(false)}
              disabled={deletingAccount}
            >
              <Text style={styles.deleteCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 25, marginTop: 10 },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#161616",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0B0B0B",
  },
  nameText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  phoneText: { color: "#888", fontSize: 13, marginBottom: 12 },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600", marginLeft: 5 },
  card: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#262626",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "bold" },
  appointmentDetails: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: { color: "#888", fontSize: 13 },
  detailValue: { color: "#FFF", fontSize: 13, fontWeight: "500" },
  progressSection: {},
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { color: "#888", fontSize: 12 },
  progressTime: { fontSize: 12, fontWeight: "bold" },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#262626",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 3 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    width: "48%",
    borderWidth: 1,
    borderColor: "#262626",
  },
  statNumber: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 4,
  },
  statLabel: { color: "#888", fontSize: 12 },
  menuContainer: {
    backgroundColor: "#161616",
    borderRadius: 20,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    color: "#FFFFFF",
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    fontWeight: "500",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1111",
    borderWidth: 1,
    borderColor: "#3D1C1C",
    borderRadius: 20,
    paddingVertical: 16,
  },
  signOutText: {
    color: "#FF4D4D",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 10,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3D1C1C",
    borderRadius: 20,
    paddingVertical: 14,
    marginTop: 12,
  },
  deleteConfirmButton: { backgroundColor: "#A83232" },
  deleteCancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteCancelText: { color: "#CCC", fontSize: 14, fontWeight: "600" },
  deleteAccountText: {
    color: "#FF4D4D",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubTitle: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 15,
  },
  modalDescription: {
    color: "#CCC",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalSettingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  inputLabel: { color: "#AAA", fontSize: 12, marginBottom: 6, marginTop: 10 },
  textInput: {
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#FFF",
    fontSize: 14,
  },
  colorPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  modalButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  modalButtonText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
  serviceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
});
