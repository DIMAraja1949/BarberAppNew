import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");
const cardWidth = width / 2 - 30;

const THEME = {
  colors: {
    primary: "#CD813E",
    light: "#F5F5F5",
    white: "#FFFFFF",
    black: "#1A1A1A",
  },
  radius: { sm: 8, md: 12, lg: 15, xl: 20 },
};

const CATEGORIES = ["All", "Hair Cut", "Hair Color", "Beard", "VIP Services"];

const REAL_GALLERY = [
  {
    id: "g1",
    title: "Clean Fade Look",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g2",
    title: "Classic Beard Trim",
    image: "https://images.unsplash.com/photo-1622287162691-46401eff9075?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g3",
    title: "VIP Styling",
    image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop",
  },
];

const fallbackBarbers = [
  {
    id: "offline-1",
    name: "Simo Dayyan",
    specialty: "Hair Cut",
    rating: 4.8,
    price: "40 MAD",
    image_url:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "offline-2",
    name: "Alex Pro",
    specialty: "VIP Services",
    rating: 4.7,
    price: "45 MAD",
    image_url:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
  },
];

const BarberCard = ({
  item,
  onPress,
}: {
  item: any;
  onPress: (barber: any) => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={({ pressed }) => [
          styles.barberCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => onPress(item)}
      >
        <Image
          source={{ uri: item.image_url || "https://via.placeholder.com/150" }}
          style={styles.barberImage}
          contentFit="cover"
        />
        <View style={styles.barberInfo}>
          <View style={styles.nameRatingRow}>
            <Text style={styles.barberName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{item.price || "40 MAD"}</Text>
            <View style={styles.addBtn}>
              <Ionicons name="calendar-outline" size={14} color="#FFF" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function IndexScreen() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("MOHAMEDDAYAN2");
  const [userAvatar, setUserAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [barbers, setBarbers] = useState<any[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      getUserProfile();
      fetchBarbers();
    }
  }, [session]);

  const getUserProfile = async () => {
    try {
      const user = session?.user;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", user.id)
          .single();

        if (data?.name) {
          setUserName(data.name.toUpperCase());
        }

        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    } catch (e) {
      // Keep default
    }
  };

  const fetchBarbers = async () => {
    try {
      setBarbersLoading(true);
      const { data, error } = await supabase.from("barbers").select("*");
      if (error) throw error;
      setBarbers(
        (data && data.length > 0 ? data : fallbackBarbers) || fallbackBarbers,
      );
    } catch (e) {
      setBarbers(fallbackBarbers);
    } finally {
      setBarbersLoading(false);
    }
  };

  const filteredBarbers = useMemo(() => {
    return barbers.filter((barber) => {
      const matchesSearch = barber.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || barber.specialty === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, barbers]);

  const handleBooking = (barber: any) => {
    router.push({
      pathname: "/booking" as any,
      params: {
        barberId: barber.id,
        barberName: barber.name,
        barberRating: barber.rating,
        barberImage: barber.image_url,
      },
    });
  };

  async function handleAuth() {
    if (!identifier || !password || (isSignUpMode && !fullName)) {
      Alert.alert("Required", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      const isEmail = identifier.includes("@");
      const emailToUse = isEmail 
        ? identifier.trim() 
        : `${identifier.replace(/[^0-9]/g, "")}@barbershop.app`;
      const phoneToUse = isEmail ? null : identifier.trim();

      if (isSignUpMode) {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email: emailToUse,
          password: password,
        });

        if (signUpError) throw signUpError;

        if (user) {
          await supabase.from("profiles").upsert([
            { id: user.id, name: fullName, email: emailToUse, phone: phoneToUse }
          ]);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: password,
        });

        if (signInError) throw signInError;
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", backgroundColor: "#000" }]}>
        <ActivityIndicator size="large" color="#CD813E" />
      </View>
    );
  }

  if (session) {
    return (
      <SafeAreaView style={styles.homeContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
        >
          {/* Header */}
          <Pressable 
            style={styles.header} 
            onPress={() => router.push('/profile' as any)}
          >
            <View>
              <Text style={styles.greetingTitle}>HI, {userName}</Text>
              <View style={styles.profileSubRow}>
                <Text style={styles.greetingSub}>Edit Profile & Settings</Text>
                <Ionicons name="create-outline" size={14} color="#CD813E" style={{ marginLeft: 4 }} />
              </View>
            </View>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {uploadingAvatar ? (
                  <View style={[styles.avatar, { justifyContent: "center", alignItems: "center" }]}>
                    <ActivityIndicator size="small" color="#CD813E" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: userAvatar }}
                    style={styles.avatar}
                  />
                )}
              </View>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={10} color="#FFF" />
              </View>
            </View>
          </Pressable>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#999"
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Search barber or service..."
              style={styles.searchInput}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable style={styles.filterBtn}>
              <Ionicons name="options-outline" size={20} color="#CD813E" />
            </Pressable>
          </View>

          {/* Banner */}
          <View style={styles.bannerContainer}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
              }}
              style={styles.bannerImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>30% OFF</Text>
              <Text style={styles.bannerSub}>On your first booking</Text>
            </View>
          </View>

          {/* Live Consultation */}
          <Link href={"/consultation" as any} asChild>
            <Pressable style={styles.consultationCard}>
              <View style={styles.consultationLeft}>
                <View style={styles.videoIconCircle}>
                  <Ionicons name="videocam" size={22} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.consultationTitle}>Live Consultation</Text>
                  <Text style={styles.consultationSub}>
                    Talk to your barber now
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CD813E" />
            </Pressable>
          </Link>

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesList}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.categoryBtn,
                  activeCategory === cat && styles.activeCategoryBtn,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === cat && styles.activeCategoryText,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Gallery */}
          <View style={styles.sectionHeaderFlex}>
            <Text style={styles.sectionTitle}>Real Works & Styles</Text>
            <Text style={styles.seeAll}>View All</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
            {REAL_GALLERY.map((item) => (
              <View key={item.id} style={styles.galleryCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.galleryImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.85)"]}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.galleryText}>{item.title}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Top Barbers */}
          <View style={styles.sectionHeaderFlex}>
            <Text style={styles.sectionTitle}>Top Barbers</Text>
            <Text style={styles.seeAll}>See All</Text>
          </View>

          {barbersLoading ? (
            <ActivityIndicator
              color={THEME.colors.primary}
              size="large"
              style={{ marginTop: 20 }}
            />
          ) : (
            <View style={styles.barberGrid}>
              {filteredBarbers.length > 0 ? (
                filteredBarbers.map((item) => (
                  <BarberCard key={item.id} item={item} onPress={handleBooking} />
                ))
              ) : (
                <Text style={styles.noResult}>No barbers found</Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop" }}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.authHeader}>
                <FontAwesome5 name="cut" size={36} color="#CD813E" style={styles.logoIcon} />
                <Text style={styles.authTitle}>Barber Shop</Text>
                <Text style={styles.authSubtitle}>PREMIUM EXPERIENCE</Text>
              </View>

              <Animated.View
                style={[
                  styles.welcomeContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.welcomeTitle}>
                  {isSignUpMode ? "Create Account" : "Welcome back"}
                </Text>
                <Text style={styles.welcomeTitleMulti}>مرحباً بك • Bienvenido • Bienvenue</Text>
                <Text style={styles.welcomeSubtitle}>
                  {isSignUpMode ? "Sign up with email or phone" : "Sign in with your email or phone number"}
                </Text>
              </Animated.View>

              <View style={styles.form}>
                {isSignUpMode && (
                  <>
                    <Text style={styles.label}>FULL NAME</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Simo Dayyan"
                        placeholderTextColor="#666"
                        value={fullName}
                        onChangeText={setFullName}
                      />
                    </View>
                  </>
                )}

                <Text style={styles.label}>EMAIL OR PHONE NUMBER</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com or 06XXXXXXXX"
                    placeholderTextColor="#666"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="********"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && { opacity: 0.7 }]}
                  onPress={handleAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {isSignUpMode ? "SIGN UP →" : "LOG IN →"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.switchModeContainer} 
                  onPress={() => setIsSignUpMode(!isSignUpMode)}
                >
                  <Text style={styles.switchText}>
                    {isSignUpMode ? "Already have an account? " : "Don't have an account? "}
                    <Text style={styles.switchLink}>
                      {isSignUpMode ? "Log In" : "Sign Up"}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  homeContainer: { flex: 1, backgroundColor: "#FFF" },
  bgImage: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)" },
  keyboardView: { flex: 1 },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 40,
  },
  scrollPadding: { paddingHorizontal: 20, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME.colors.black,
    letterSpacing: -0.5,
  },
  profileSubRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  greetingSub: { fontSize: 13, color: THEME.colors.primary, fontWeight: "700" },
  avatarWrapper: {
    position: "relative",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEE",
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: THEME.colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 15,
    height: 55,
    borderRadius: THEME.radius.lg,
    marginTop: 25,
    alignItems: "center",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#000" },
  filterBtn: { padding: 5 },
  bannerContainer: {
    marginTop: 25,
    borderRadius: THEME.radius.xl,
    overflow: "hidden",
    height: 160,
    position: "relative",
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerTextContainer: { position: "absolute", bottom: 20, left: 20 },
  bannerTitle: { color: "#FFF", fontSize: 24, fontWeight: "900" },
  bannerSub: { color: "#FFF", fontSize: 14, opacity: 0.8 },
  consultationCard: {
    backgroundColor: "#FFF",
    marginTop: 20,
    padding: 15,
    borderRadius: THEME.radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 2,
  },
  consultationLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  videoIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#CD813E",
    justifyContent: "center",
    alignItems: "center",
  },
  consultationTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  consultationSub: { fontSize: 12, color: "#888", marginTop: 2 },
  sectionHeaderFlex: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 15,
    color: THEME.colors.black,
  },
  seeAll: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  categoriesList: { marginBottom: 10 },
  categoryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: THEME.radius.lg,
    marginRight: 10,
    backgroundColor: "#F8F8F8",
  },
  activeCategoryBtn: { backgroundColor: THEME.colors.primary },
  categoryText: { color: "#666", fontWeight: "700", fontSize: 13 },
  activeCategoryText: { color: "#FFF" },
  galleryCard: {
    width: 140,
    height: 180,
    borderRadius: THEME.radius.lg,
    overflow: "hidden",
    marginRight: 12,
    position: "relative",
    justifyContent: "flex-end",
    padding: 10,
    backgroundColor: "#1A1A1A",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  galleryText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  barberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  barberCard: {
    backgroundColor: "#FFF",
    width: cardWidth,
    borderRadius: THEME.radius.xl,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  barberImage: { width: "100%", height: 130, borderRadius: THEME.radius.lg },
  barberInfo: { marginTop: 10, paddingHorizontal: 4 },
  nameRatingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  barberName: { fontSize: 14, fontWeight: "800", color: "#1A1A1A", flex: 1 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 11, color: "#666", fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priceText: { fontSize: 13, color: THEME.colors.primary, fontWeight: "800" },
  addBtn: {
    width: 28,
    height: 28,
    backgroundColor: THEME.colors.black,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  noResult: {
    width: "100%",
    textAlign: "center",
    marginTop: 30,
    color: "#999",
    fontSize: 14,
  },
  authHeader: { alignItems: "center", marginBottom: 20 },
  logoIcon: { marginBottom: 6 },
  authTitle: { fontSize: 26, color: "#CD813E", fontWeight: "bold", textAlign: "center" },
  authSubtitle: { fontSize: 9, color: "#CD813E", letterSpacing: 2, marginTop: 4 },
  welcomeContainer: { marginBottom: 25, alignItems: "center" },
  welcomeTitle: { fontSize: 32, color: "#fff", fontWeight: "bold", textAlign: "center" },
  welcomeTitleMulti: { fontSize: 16, color: "#fff", fontWeight: "600", marginTop: 8, textAlign: "center" },
  welcomeSubtitle: { fontSize: 13, color: "#ddd", marginTop: 8, textAlign: "center" },
  form: { width: "100%" },
  label: { color: "#CD813E", fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 1 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(205, 129, 62, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 15 },
  loginButton: {
    backgroundColor: "#CD813E",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: { color: "#000", fontSize: 15, fontWeight: "bold" },
  switchModeContainer: { marginTop: 20, alignItems: "center" },
  switchText: { color: "#888", fontSize: 13 },
  switchLink: { color: "#CD813E", fontWeight: "bold" },
});