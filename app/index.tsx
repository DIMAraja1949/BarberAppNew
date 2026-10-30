import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGuestMode } from "../lib/guestMode";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");
const cardWidth = width / 2 - 30;

const THEME = {
  colors: {
    primary: "#CD813E",
    light: "#EFEFF4",
    white: "#FFFFFF",
    black: "#1A1A1A",
  },
  radius: { sm: 8, md: 12, lg: 15, xl: 20 },
};

const CATEGORIES = ["All", "Hair Cut", "Hair Color", "Beard", "VIP Services"];

const SHOP_WHATSAPP_NUMBER = "212693222558";

// عروض البانر المتحركة بطابع عصري 2026
const PROMO_BANNERS = [
  {
    id: "b1",
    title: "30% OFF",
    subtitle: "On your first premium booking",
    code: "WELCOME30",
    image_url:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "b2",
    title: "VIP BEARD TRIM",
    subtitle: "Get free styling oil with every beard care",
    code: "VIPBEARD",
    image_url:
      "https://images.unsplash.com/photo-1622287162691-46401eff9075?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "b3",
    title: "SATURDAY SPECIAL",
    subtitle: "Book 2 services and get 15% discount",
    code: "WEEKEND15",
    image_url:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1000&auto=format&fit=crop",
  },
];

const fallbackGallery = [
  {
    id: "g1",
    title: "Clean Fade Look",
    image_url:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g2",
    title: "Classic Beard Trim",
    image_url:
      "https://images.unsplash.com/photo-1622287162691-46401eff9075?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g3",
    title: "VIP Styling",
    image_url:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop",
  },
];

type GalleryReportTarget = {
  id: string;
  title: string;
  reportedUserId?: string;
};

const BarberCard = ({
  item,
  onPress,
  onUpdateImage,
  isFav,
  onToggleFav,
  isAdmin,
}: {
  item: any;
  onPress: (barber: any) => void;
  onUpdateImage: (barberId: string) => void;
  isFav: boolean;
  onToggleFav: (item: any) => void;
  isAdmin: boolean;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const accent = item.primaryColor || "#CD813E";

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={({ pressed }) => [
          styles.barberCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => onPress(item)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: item.image_url || "https://via.placeholder.com/150",
            }}
            style={styles.barberImage}
            contentFit="cover"
          />
          {isAdmin && (
            <TouchableOpacity
              style={[styles.editBarberBtn, { borderColor: accent }]}
              onPress={(e) => {
                e.stopPropagation();
                onUpdateImage(item.id);
              }}
            >
              <Ionicons name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.heartBarberBtn}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFav(item);
            }}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={16}
              color={isFav ? "#FF4B4B" : "#FFF"}
            />
          </TouchableOpacity>
        </View>

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
            <Text style={[styles.priceText, { color: accent }]}>
              {item.price || "40 MAD"}
            </Text>
            <View style={[styles.addBtn, { backgroundColor: accent }]}>
              <Ionicons name="calendar-outline" size={14} color="#FFF" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestMode, setGuestMode } = useGuestMode();
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("USER");
  const ADMIN_EMAIL = "mohameddayan2@gmail.com";
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const [userAvatar, setUserAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#CD813E");

  const [barbers, setBarbers] = useState<any[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(true);

  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryReportTarget, setGalleryReportTarget] =
    useState<GalleryReportTarget | null>(null);
  const [galleryReportReason, setGalleryReportReason] = useState("");
  const [submittingGalleryReport, setSubmittingGalleryReport] = useState(false);

  // States for Lightbox Slider
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // State for Banner Auto Slide Index
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const bannerListRef = useRef<FlatList>(null);
  const bannerIndexRef = useRef(0);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  const [favorites, setFavorites] = useState<string[]>([]);
  // Filter & Sort State
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState<
    "default" | "rating" | "price_low" | "price_high"
  >("default");

  const [isFavoritesVisible, setIsFavoritesVisible] = useState(false);

  // Home service request states
  const [homeBarber, setHomeBarber] = useState<any>(null);
  const [homeRequestVisible, setHomeRequestVisible] = useState(false);
  const [homeClientName, setHomeClientName] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLocationUrl, setHomeLocationUrl] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const [homeNotes, setHomeNotes] = useState("");
  const [homeSelectedDateId, setHomeSelectedDateId] = useState("0");
  const [homeSelectedTime, setHomeSelectedTime] = useState("");
  const [homeBookedSlots, setHomeBookedSlots] = useState<any[]>([]);
  const [homeWorkingHours, setHomeWorkingHours] = useState({
    start: "09:00",
    end: "21:00",
  });
  const [homeSlotLoading, setHomeSlotLoading] = useState(false);
  const [homeAvailabilityError, setHomeAvailabilityError] = useState("");
  const [homeAvailabilityRefreshToken, setHomeAvailabilityRefreshToken] =
    useState(0);
  const [loadingHomeLocation, setLoadingHomeLocation] = useState(false);
  const [sendingHome, setSendingHome] = useState(false);

  const homeDateOptions = useMemo(() => {
    const options: { id: string; day: string; num: string }[] = [];
    const today = new Date();
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push({
        id: String(i),
        day: dayNames[date.getDay()],
        num: String(date.getDate()),
      });
    }
    return options;
  }, []);

  const homeTimeOptions = useMemo(() => {
    const slots: string[] = [];
    const startHour = parseInt(homeWorkingHours.start.split(":")[0], 10);
    const endHour = parseInt(homeWorkingHours.end.split(":")[0], 10);
    let hour = startHour;
    let minute = 0;
    while (hour < endHour) {
      slots.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    return slots;
  }, [homeWorkingHours]);

  useEffect(() => {
    let active = true;
    const loadHomeWorkingHours = async () => {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "working_hours")
          .single();
        if (!error && data?.value) {
          if (active) setHomeWorkingHours(data.value);
          await AsyncStorage.setItem(
            "workingHours",
            JSON.stringify(data.value),
          );
          return;
        }
      } catch (error) {
        console.warn("Could not load shop working hours:", error);
      }
      try {
        const cached = await AsyncStorage.getItem("workingHours");
        if (active && cached) setHomeWorkingHours(JSON.parse(cached));
      } catch (error) {
        console.warn("Could not read cached working hours:", error);
      }
    };
    loadHomeWorkingHours();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAvailability = async () => {
      if (!homeRequestVisible || !homeBarber) {
        setHomeBookedSlots([]);
        setHomeAvailabilityError("");
        setHomeSlotLoading(false);
        return;
      }
      const selectedDate = homeDateOptions[parseInt(homeSelectedDateId, 10)];
      if (!selectedDate) {
        setHomeBookedSlots([]);
        setHomeAvailabilityError("Could not read the selected date.");
        return;
      }
      setHomeSlotLoading(true);
      setHomeAvailabilityError("");
      const bookingDate = `${selectedDate.day}, ${selectedDate.num}`;
      try {
        const { data, error } = await (supabase as any).rpc(
          "get_booking_availability",
          {
            p_booking_date: bookingDate,
            p_barber_name: String(homeBarber.name || ""),
          },
        );
        if (error) throw error;
        if (!active) return;
        setHomeBookedSlots(data || []);
      } catch (error: any) {
        if (active) {
          setHomeBookedSlots([]);
          setHomeAvailabilityError(
            error.message || "Could not load available times.",
          );
        }
      } finally {
        if (active) setHomeSlotLoading(false);
      }
    };
    loadAvailability();
    return () => {
      active = false;
    };
  }, [
    homeRequestVisible,
    homeBarber,
    homeSelectedDateId,
    homeAvailabilityRefreshToken,
    homeDateOptions,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const loadCachedAvatar = async () => {
      try {
        const cached = await AsyncStorage.getItem("userAvatar");
        if (cached) setUserAvatar(cached);
      } catch (e) {}
    };
    loadCachedAvatar();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Keep the same object if the user didn't change (avoids useless re-renders/refetches)
      setSession((prev: any) =>
        prev?.user?.id === newSession?.user?.id && !!prev === !!newSession
          ? prev
          : newSession,
      );
    });

    // Initial load handled in useFocusEffect below

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

  useFocusEffect(
    useCallback(() => {
      const loadTheme = async () => {
        try {
          const savedColor = await AsyncStorage.getItem("primaryColor");
          if (savedColor) setPrimaryColor(savedColor);
        } catch (e) {}
      };
      loadTheme();
      loadFavorites();
      setActiveTab("home");
    }, []),
  );

  // Auto scroll banners every 4 seconds
  useEffect(() => {
    if ((!session && !guestMode) || promoBanners.length <= 1) return;
    const interval = setInterval(() => {
      const next = (bannerIndexRef.current + 1) % promoBanners.length;
      bannerIndexRef.current = next;
      bannerListRef.current?.scrollToOffset({
        offset: next * (width - 40),
        animated: true,
      });
      setActiveBannerIndex(next);
    }, 4000);
    return () => clearInterval(interval);
  }, [session, guestMode, promoBanners.length, width]);

  // Load public dashboard content for guests as well as signed-in users.
  useEffect(() => {
    if (session?.user?.id) getUserProfile();

    if (session?.user?.id || guestMode) {
      fetchBarbers();
      fetchGallery();
      fetchBanners();
      loadFavorites();
    }
  }, [session?.user?.id, guestMode]);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem("favorites");
      if (saved) {
        const favs = JSON.parse(saved);
        // Map to IDs for easier local state management
        setFavorites(favs.map((f: any) => f.id));
      }
    } catch (e) {}
  };

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
        } else if (user.email) {
          // Fallback to email prefix if name is missing
          const emailPrefix = user.email.split("@")[0].toUpperCase();
          setUserName(emailPrefix);
        }

        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
          await AsyncStorage.setItem("userAvatar", data.avatar_url);
        }
      }
    } catch (e) {
      // Even on error, try to use email prefix
      if (session?.user?.email) {
        setUserName(session.user.email.split("@")[0].toUpperCase());
      }
    }
  };

  const handlePickAndUploadAvatar = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "Permission to access camera roll is required!",
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) return;

      const imageUri = pickerResult.assets[0].uri;
      setUploadingAvatar(true);

      const user = session?.user;
      if (!user) return;

      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const base64Response = await fetch(imageUri);
      const arrayBuffer = await base64Response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (!data || !data.publicUrl) throw new Error("Could not get public URL");

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      setUserAvatar(publicUrl);
      await AsyncStorage.setItem("userAvatar", publicUrl);

      await supabase
        .from("barbers")
        .update({ image_url: publicUrl })
        .eq("name", "Simo Dayyan");
      fetchBarbers();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateBarberImage = async (barberId: string) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "Permission to access camera roll is required!",
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) return;

      const imageUri = pickerResult.assets[0].uri;
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `barber-${barberId}-${Date.now()}.${fileExt}`;

      const base64Response = await fetch(imageUri);
      const arrayBuffer = await base64Response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (!data || !data.publicUrl) throw new Error("Could not get public URL");

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from("barbers")
        .update({ image_url: publicUrl })
        .eq("id", barberId);

      if (dbError) throw dbError;

      Alert.alert("Success", "Barber image updated successfully!");
      fetchBarbers();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update barber image");
    }
  };

  const fetchBarbers = async () => {
    try {
      if (barbers.length === 0) setBarbersLoading(true);
      const { data, error } = await supabase.from("barbers").select("*");
      if (error) throw error;

      if (!data || data.length === 0) {
        const defaultBarbers = [
          {
            id: "offline-1",
            name: "Simo Dayyan",
            specialty: "Hair Cut",
            rating: 5.0,
            price: "40 MAD",
            image_url: userAvatar,
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
        await supabase.from("barbers").upsert(defaultBarbers);
        setBarbers(defaultBarbers);
      } else {
        setBarbers(data);
      }
    } catch (e) {
      setBarbers([
        {
          id: "offline-1",
          name: "Simo Dayyan",
          specialty: "Hair Cut",
          rating: 5.0,
          price: "40 MAD",
          image_url: userAvatar,
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
      ]);
    } finally {
      setBarbersLoading(false);
    }
  };

  const fetchGallery = async () => {
    try {
      const savedBlockedUsers = await AsyncStorage.getItem("blockedUserIds");
      const blockedUserIds: string[] = savedBlockedUsers
        ? JSON.parse(savedBlockedUsers)
        : [];
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGalleryItems(
        (data && data.length > 0 ? data : fallbackGallery).filter(
          (item) => {
            const creatorId = item.user_id || item.created_by || item.owner_id;
            return !creatorId || !blockedUserIds.includes(creatorId);
          },
        ),
      );
    } catch (e) {
      setGalleryItems(fallbackGallery);
    }
  };

  const submitGalleryReport = async () => {
    const target = galleryReportTarget;
    const reason = galleryReportReason.trim();
    if (!target || !reason) {
      Alert.alert("Reason required", "Please describe why you are reporting this work.");
      return;
    }

    setSubmittingGalleryReport(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from("content_reports").insert({
        content_type: "gallery",
        target_content_id: target.id,
        reported_user_id: target.reportedUserId ?? null,
        reporter_user_id: session?.user.id ?? null,
        reason,
      });
      if (error) throw error;

      setGalleryReportTarget(null);
      setGalleryReportReason("");
      Alert.alert("Report received", "Thank you. Our moderation team will review this content.");
    } catch (error) {
      Alert.alert(
        "Report not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmittingGalleryReport(false);
    }
  };

  const blockGalleryUser = (userId: string, userName?: string) => {
    Alert.alert(
      "Block this account?",
      `${userName || "This user"}'s posts and reels will be hidden on this device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              const savedBlockedUsers =
                await AsyncStorage.getItem("blockedUserIds");
              let existingIds: string[] = [];
              if (savedBlockedUsers) {
                const parsed: unknown = JSON.parse(savedBlockedUsers);
                if (
                  !Array.isArray(parsed) ||
                  !parsed.every((id) => typeof id === "string")
                ) {
                  throw new Error("Your blocked-account list is invalid.");
                }
                existingIds = parsed;
              }
              const nextBlockedIds = Array.from(
                new Set([...existingIds, userId]),
              );
              setGalleryItems((items) =>
                items.filter(
                  (item) =>
                    (item.user_id || item.created_by || item.owner_id) !==
                    userId,
                ),
              );
              await AsyncStorage.setItem(
                "blockedUserIds",
                JSON.stringify(nextBlockedIds),
              );
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const { error } = await supabase.from("content_reports").insert({
                content_type: "user_block",
                target_content_id: userId,
                reported_user_id: userId,
                reporter_user_id: session?.user.id ?? null,
                reason: `User blocked ${userName || userId}. Content hidden on this device.`,
              });
              if (error) {
                Alert.alert(
                  "User blocked locally",
                  `This user's content is hidden on this device, but the moderation team could not be notified: ${error.message}`,
                );
              }
            } catch (error) {
              Alert.alert(
                "User blocked locally",
                `This user's content is hidden for now, but the block could not be saved or sent to moderation. ${
                  error instanceof Error ? error.message : "Please try again."
                }`,
              );
            }
          },
        },
      ],
    );
  };

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPromoBanners(data && data.length > 0 ? data : PROMO_BANNERS);
    } catch (e) {
      setPromoBanners(PROMO_BANNERS);
    }
  };

  const handleDeleteGalleryImage = async (id: string) => {
    Alert.alert("Delete Image", "Are you sure you want to delete this work?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.from("gallery").delete().eq("id", id);
            fetchGallery();
          } catch (e) {
            Alert.alert("Error", "Failed to delete image");
          }
        },
      },
    ]);
  };

  const handleAddGalleryImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "Permission to access camera roll is required!",
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) return;

      const imageUri = pickerResult.assets[0].uri;

      Alert.prompt(
        "Gallery Title",
        "Enter a title for this work (e.g. Skin Fade):",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upload",
            onPress: async (titleText?: string) => {
              if (!titleText) return;
              try {
                setUploadingGallery(true);
                const fileExt =
                  imageUri.split(".").pop()?.toLowerCase() || "jpg";
                const filePath = `gallery-${Date.now()}.${fileExt}`;

                const base64Response = await fetch(imageUri);
                const arrayBuffer = await base64Response.arrayBuffer();

                const { error: uploadError } = await supabase.storage
                  .from("gallery")
                  .upload(filePath, arrayBuffer, {
                    contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
                    upsert: true,
                  });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                  .from("gallery")
                  .getPublicUrl(filePath);
                if (!data || !data.publicUrl)
                  throw new Error("Could not get public URL");

                const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

                const { error: dbError } = await supabase
                  .from("gallery")
                  .insert([
                    { title: titleText || "Fresh Look", image_url: publicUrl },
                  ]);

                if (dbError) throw dbError;

                Alert.alert("Success", "Photo added to gallery successfully!");
                fetchGallery();
              } catch (err: any) {
                Alert.alert(
                  "Error",
                  err.message || "Failed to upload gallery item",
                );
              } finally {
                setUploadingGallery(false);
              }
            },
          },
        ],
        "plain-text",
        "New Style",
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const filteredBarbers = useMemo(() => {
    let result = barbers.filter((barber) => {
      const matchesSearch = barber.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || barber.specialty === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "price_low") {
      result.sort((a, b) => parseInt(a.price) - parseInt(b.price));
    } else if (sortBy === "price_high") {
      result.sort((a, b) => parseInt(b.price) - parseInt(a.price));
    }
    return result;
  }, [searchQuery, activeCategory, barbers, sortBy]);

  const openHomeService = () => {
    setHomeBarber(null);
    setHomeClientName(userName === "USER" ? "" : userName);
    setHomeAddress("");
    setHomeLocationUrl("");
    setHomePhone("");
    setHomeNotes("");
    setHomeSelectedDateId("0");
    setHomeSelectedTime("");
    setHomeBookedSlots([]);
    setHomeAvailabilityError("");
    setHomeRequestVisible(true);
  };

  const addCurrentLocation = async () => {
    try {
      setLoadingHomeLocation(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location permission",
          "Allow location access to add your current location, or type your address manually.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;
      const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      setHomeLocationUrl(mapUrl);

      let readableAddress = "";
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const place = places?.[0];
        readableAddress = [
          place?.name,
          place?.street,
          place?.district,
          place?.city,
          place?.region,
        ]
          .filter(Boolean)
          .filter((part, index, values) => values.indexOf(part) === index)
          .join(", ");
      } catch (geocodeError) {
        console.warn("Could not resolve a readable address:", geocodeError);
      }

      setHomeAddress(
        readableAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      );
      Alert.alert(
        "Location added",
        "Your current location and map link have been added to the request.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not get location",
        error.message || "Please enter your address manually.",
      );
    } finally {
      setLoadingHomeLocation(false);
    }
  };

  const submitHomeRequest = async () => {
    if (!homeBarber) {
      Alert.alert(
        "Choose a barber",
        "Please select the barber you want to visit you.",
      );
      return;
    }
    const selectedDate = homeDateOptions[parseInt(homeSelectedDateId, 10)];
    if (!selectedDate || !homeSelectedTime) {
      Alert.alert(
        "Choose a time",
        "Please select an available date and time for the home visit.",
      );
      return;
    }
    if (
      !homeClientName.trim() ||
      !homePhone.trim() ||
      (!homeAddress.trim() && !homeLocationUrl)
    ) {
      Alert.alert(
        "Required",
        "Please enter your name, phone number, and address or current location.",
      );
      return;
    }
    if (homePhone.replace(/[^0-9]/g, "").length < 8) {
      Alert.alert("Invalid phone", "Please enter a valid phone number.");
      return;
    }
    if (homeSlotLoading || homeAvailabilityError) {
      Alert.alert(
        "Availability unavailable",
        "We could not verify this time. Please retry loading the available times.",
      );
      return;
    }
    if (!session?.user) {
      Alert.alert(
        "Sign in required",
        "Sign in or create an account to request an at-home visit.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign in", onPress: () => setGuestMode(false) },
        ],
      );
      return;
    }

    const bookingDate = `${selectedDate.day}, ${selectedDate.num}`;
    const selectedBarberName = String(homeBarber.name || "");
    if (
      homeBookedSlots.some(
        (booking) => booking.booking_time === homeSelectedTime,
      )
    ) {
      setHomeSelectedTime("");
      setHomeAvailabilityRefreshToken((value) => value + 1);
      Alert.alert(
        "Time no longer available",
        "That time is already booked or closed. Please choose another time.",
      );
      return;
    }

    try {
      setSendingHome(true);
      const { data: latestSlots, error: availabilityError } = await (
        supabase as any
      ).rpc("get_booking_availability", {
        p_booking_date: bookingDate,
        p_barber_name: selectedBarberName,
      });
      if (availabilityError) throw availabilityError;
      const conflict = (latestSlots || []).some(
        (booking: any) => booking.booking_time === homeSelectedTime,
      );
      if (conflict) {
        setHomeSelectedTime("");
        setHomeAvailabilityRefreshToken((value) => value + 1);
        Alert.alert(
          "Time no longer available",
          "Someone just booked or closed that time. Please choose another.",
        );
        return;
      }

      const { data: bookingId, error: bookingError } = await (
        supabase as any
      ).rpc("create_pending_booking", {
        p_booking_date: bookingDate,
        p_booking_time: homeSelectedTime,
        p_barber_name: selectedBarberName,
        p_service: "Home visit request",
      });
      if (bookingError) {
        if (bookingError.code === "23505") {
          setHomeSelectedTime("");
          setHomeAvailabilityRefreshToken((value) => value + 1);
          Alert.alert(
            "Time no longer available",
            "That time was just reserved. Please choose another.",
          );
          return;
        }
        throw bookingError;
      }

      const addressForRecord = [
        homeAddress.trim(),
        homeLocationUrl ? `Map: ${homeLocationUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const notesForRecord = [
        `Client: ${homeClientName.trim()}`,
        `Requested visit: ${bookingDate} at ${homeSelectedTime}`,
        homeNotes.trim(),
      ]
        .filter(Boolean)
        .join("\n");
      const message = [
        "*AT-HOME BARBER REQUEST*",
        "",
        `Barber: ${selectedBarberName}`,
        `Date: ${bookingDate}`,
        `Time: ${homeSelectedTime}`,
        `Client: ${homeClientName.trim()}`,
        `Phone: ${homePhone.trim()}`,
        `Address: ${homeAddress.trim() || "See map link"}`,
        homeLocationUrl ? `Current location: ${homeLocationUrl}` : "",
        homeNotes.trim() ? `Notes: ${homeNotes.trim()}` : "",
        "",
        "Please confirm availability and price.",
      ]
        .filter(Boolean)
        .join("\n");
      const whatsappUrl = `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      let databaseWarning = "";
      try {
        const { error } = await (supabase as any).from("home_requests").insert([
          {
            user_id: session.user.id,
            booking_id: bookingId,
            barber_id: String(homeBarber.id),
            barber_name: selectedBarberName,
            address: addressForRecord,
            phone: homePhone.trim(),
            notes: notesForRecord,
          },
        ]);
        if (error) databaseWarning = error.message;
      } catch (error: any) {
        databaseWarning =
          error.message || "Could not save the request details.";
      }

      setHomeRequestVisible(false);
      setHomeBarber(null);
      setHomeClientName("");
      setHomeAddress("");
      setHomeLocationUrl("");
      setHomePhone("");
      setHomeNotes("");
      setHomeSelectedTime("");
      try {
        await Linking.openURL(whatsappUrl);
        Alert.alert(
          "WhatsApp opened",
          databaseWarning
            ? `The request is reserved as pending and ready in WhatsApp. Tap Send there. Note: ${databaseWarning}`
            : "The requested time is pending shop confirmation. WhatsApp is ready with the request; tap Send to deliver it.",
          [
            {
              text: "حجوزاتي",
              onPress: openMyBookings,
            },
            { text: "موافق", style: "cancel" },
          ],
        );
      } catch (whatsappError: any) {
        Alert.alert(
          "Request reserved",
          `The selected time is held as pending, but WhatsApp could not be opened. ${whatsappError.message || "Please open WhatsApp manually to contact the shop."}`,
          [
            {
              text: "حجوزاتي",
              onPress: openMyBookings,
            },
            { text: "موافق", style: "cancel" },
          ],
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Could not reserve visit",
        error.message || "Please try again.",
      );
    } finally {
      setSendingHome(false);
    }
  };

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

  const openMyBookings = () => {
    if (guestMode) {
      Alert.alert(
        "Sign in required",
        "Sign in to view and track your booking requests.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign in", onPress: () => setGuestMode(false) },
        ],
      );
      return;
    }
    router.push("/my-bookings" as any);
  };

  const toggleFavorite = async (barber: any) => {
    try {
      const saved = await AsyncStorage.getItem("favorites");
      let favsArray = saved ? JSON.parse(saved) : [];
      const isFav = favsArray.some((f: any) => f.id === barber.id);

      if (isFav) {
        favsArray = favsArray.filter((f: any) => f.id !== barber.id);
      } else {
        favsArray.push({
          id: barber.id,
          name: barber.name,
          image: barber.image_url,
        });
      }

      await AsyncStorage.setItem("favorites", JSON.stringify(favsArray));
      setFavorites(favsArray.map((f: any) => f.id));
    } catch (e) {}
  };

  async function handleAuth() {
    const cleanIdentifier = identifier.trim();
    if (
      !cleanIdentifier ||
      !password ||
      (isSignUpMode && (!fullName.trim() || !confirmPassword))
    ) {
      Alert.alert("Required", "Please fill in all required fields.");
      return;
    }
    if (isSignUpMode && password !== confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "Please make sure both passwords are the same.",
      );
      return;
    }
    if (isSignUpMode && !termsAccepted) {
      Alert.alert(
        "Terms required",
        "Please agree to the Terms of Use and community standards before creating an account.",
      );
      return;
    }

    try {
      setLoading(true);
      const isEmail = cleanIdentifier.includes("@");
      const emailToUse = isEmail
        ? cleanIdentifier
        : `${cleanIdentifier.replace(/[^0-9]/g, "")}@barbershop.app`;
      const phoneToUse = isEmail ? null : cleanIdentifier;

      if (isSignUpMode) {
        const {
          data: { session, user },
          error: signUpError,
        } = await supabase.auth.signUp({
          email: emailToUse,
          password,
        });
        if (signUpError) throw signUpError;

        if (user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                name: fullName.trim(),
                email: emailToUse,
                phone: phoneToUse,
              },
              { onConflict: "id" },
            );
          if (profileError) throw profileError;

          if (session || guestMode) {
            setSession(session);
          } else {
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
              });
            if (!signInError && signInData.session)
              setSession(signInData.session);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !cleanIdentifier.includes("@")) {
      Alert.alert(
        "Enter your email",
        "Password reset needs the email address linked to your account.",
      );
      return;
    }
    try {
      setLoading(true);
      const { error } =
        await supabase.auth.resetPasswordForEmail(cleanIdentifier);
      if (error) throw error;
      Alert.alert(
        "Check your email",
        "If an account exists for that address, a password reset link has been sent.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not send reset link",
        error.message || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
          },
        ]}
      >
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (session || guestMode) {
    return (
      <View
        style={[
          styles.homeContainer,
          { flex: 1, paddingTop: insets.top, backgroundColor: "#EFEFF4" },
        ]}
      >
        {/* FIXED HEADER (2027 Pro Style) */}
        <View style={styles.fixedHeaderWrapper}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingTitle}>
                {guestMode ? "BROWSING AS GUEST" : `HI, ${userName}`}
              </Text>
              <Text style={styles.greetingSub}>
                {guestMode
                  ? "Explore barbers and styles. Sign in only to book."
                  : "Ready for a fresh look?"}
              </Text>
            </View>
            <Pressable
              onPress={handlePickAndUploadAvatar}
              style={styles.avatarContainer}
            >
              {uploadingAvatar ? (
                <View
                  style={[
                    styles.avatar,
                    {
                      justifyContent: "center",
                      alignItems: "center",
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={primaryColor} />
                </View>
              ) : (
                <Image
                  source={{ uri: userAvatar }}
                  style={[styles.avatar, { borderColor: primaryColor }]}
                />
              )}
            </Pressable>
          </View>
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
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setIsFilterVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color={primaryColor} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
        >
          {/* DYNAMIC AUTO-SLIDING PROMO BANNERS (2026 Pro Style) */}
          <View style={styles.bannerWrapper}>
            <FlatList
              ref={bannerListRef}
              data={promoBanners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / (width - 40),
                );
                bannerIndexRef.current = index;
                setActiveBannerIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={[styles.bannerContainer, { width: width - 40 }]}>
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.bannerImage}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.bannerTextContainer}>
                    <View style={styles.bannerTopRow}>
                      <View
                        style={[
                          styles.promoBadge,
                          { backgroundColor: primaryColor },
                        ]}
                      >
                        <Text style={styles.promoBadgeText}>
                          PROMO CODE: {item.code || "WELCOME"}
                        </Text>
                      </View>
                      <View style={styles.clockBadge}>
                        <Ionicons name="time-outline" size={12} color="#FFF" />
                        <Text style={styles.clockText}>{currentTime}</Text>
                      </View>
                    </View>
                    <View style={styles.bannerBottomRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bannerTitle}>{item.title}</Text>
                        <Text style={styles.bannerSub}>
                          {item.subtitle || "Limited time offer"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.bannerMapBtn,
                          { backgroundColor: primaryColor },
                        ]}
                        onPress={() => router.push("/shop-location" as any)}
                      >
                        <Ionicons name="map" size={16} color="#000" />
                        <Text style={styles.bannerMapText}>Map</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {promoBanners.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeBannerIndex === idx && [
                      styles.activeDot,
                      { backgroundColor: primaryColor },
                    ],
                  ]}
                />
              ))}
            </View>
          </View>

          {/* AT-HOME SERVICE BANNER */}
          <Pressable
            style={[
              styles.homeServiceBanner,
              { borderColor: `${primaryColor}55` },
            ]}
            onPress={openHomeService}
            accessibilityRole="button"
            accessibilityLabel="Request a barber to visit your home"
          >
            <View
              style={[
                styles.homeServiceIcon,
                { backgroundColor: `${primaryColor}22` },
              ]}
            >
              <Ionicons name="home-outline" size={23} color={primaryColor} />
            </View>
            <View style={styles.homeServiceCopy}>
              <Text style={styles.homeServiceTitle}>Barber at your home</Text>
              <Text style={styles.homeServiceSubtitle}>
                Choose a barber, add your location, and request a visit
              </Text>
            </View>
            <View
              style={[
                styles.homeServiceAction,
                { backgroundColor: primaryColor },
              ]}
            >
              <Ionicons name="arrow-forward" size={17} color="#FFF" />
            </View>
          </Pressable>

          <Pressable
            style={styles.myBookingsBanner}
            onPress={openMyBookings}
            accessibilityRole="button"
            accessibilityLabel="Track my booking requests"
          >
            <View style={styles.myBookingsIcon}>
              <Ionicons
                name="calendar-outline"
                size={21}
                color={primaryColor}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.myBookingsTitle}>My bookings</Text>
              <Text style={styles.myBookingsSubtitle}>
                See whether your appointment is pending, confirmed, or cancelled
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#777" />
          </Pressable>

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
                  activeCategory === cat && [
                    styles.activeCategoryBtn,
                    { backgroundColor: primaryColor },
                  ],
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

          {/* Real Works & Styles */}
          <View style={styles.sectionHeaderFlex}>
            <Text style={styles.sectionTitle}>Real Works & Styles</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              {isAdmin && (
                <TouchableOpacity
                  onPress={handleAddGalleryImage}
                  disabled={uploadingGallery}
                >
                  {uploadingGallery ? (
                    <ActivityIndicator size="small" color={primaryColor} />
                  ) : (
                    <View
                      style={[
                        styles.addGalleryBtn,
                        { backgroundColor: primaryColor },
                      ]}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <Text style={[styles.seeAll, { color: primaryColor }]}>
                View All
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesList}
            contentContainerStyle={{ paddingRight: 10 }}
          >
            {galleryItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                style={styles.galleryCardPro}
                onPress={() => {
                  setActiveGalleryIndex(index);
                  setIsLightboxVisible(true);
                }}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.galleryImagePro}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.85)"]}
                  style={styles.galleryGradient}
                />
                {isAdmin && (
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(255,0,0,0.8)",
                      padding: 6,
                      borderRadius: 12,
                      zIndex: 10,
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteGalleryImage(item.id);
                    }}
                  >
                    <Ionicons name="trash" size={12} color="#FFF" />
                  </TouchableOpacity>
                )}
                <View style={styles.galleryModerationActions}>
                  <TouchableOpacity
                    style={styles.galleryModerationButton}
                    accessibilityRole="button"
                    accessibilityLabel="Report this work"
                    onPress={(event) => {
                      event.stopPropagation();
                      setGalleryReportTarget({
                        id: String(item.id),
                        title: item.title || "Real Works post",
                        reportedUserId: item.user_id,
                      });
                      setGalleryReportReason("");
                    }}
                  >
                    <Ionicons name="flag-outline" size={16} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.galleryModerationButton}
                    accessibilityRole="button"
                    accessibilityLabel="Block this work's creator"
                    onPress={(event) => {
                      event.stopPropagation();
                      const creatorId =
                        item.user_id || item.created_by || item.owner_id;
                      if (!creatorId) {
                        Alert.alert(
                          "Creator unavailable",
                          "This work has no linked creator to block. You can still report the content for review.",
                        );
                        return;
                      }
                      if (creatorId === session?.user?.id) {
                        Alert.alert(
                          "Cannot block your account",
                          "You cannot block the account that is currently signed in.",
                        );
                        return;
                      }
                      blockGalleryUser(
                        creatorId,
                        item.profiles?.name || item.username,
                      );
                    }}
                  >
                    <Ionicons
                      name="person-remove-outline"
                      size={16}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.galleryTextWrapper}>
                  <Text style={styles.galleryTextPro} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Ionicons name="expand-outline" size={12} color="#CD813E" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Top Barbers */}
          <View style={styles.sectionHeaderFlex}>
            <Text style={styles.sectionTitle}>Top Barbers</Text>
            <Text style={styles.seeAll}>See All</Text>
          </View>

          {barbersLoading ? (
            <ActivityIndicator
              color={primaryColor}
              size="large"
              style={{ marginTop: 20 }}
            />
          ) : (
            <View style={styles.barberGrid}>
              {filteredBarbers.length > 0 ? (
                filteredBarbers.map((item) => (
                  <BarberCard
                    key={item.id}
                    item={{ ...item, primaryColor }}
                    onPress={handleBooking}
                    onUpdateImage={handleUpdateBarberImage}
                    isFav={favorites.includes(item.id)}
                    onToggleFav={toggleFavorite}
                    isAdmin={isAdmin}
                  />
                ))
              ) : (
                <Text style={styles.noResult}>No barbers found</Text>
              )}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={galleryReportTarget !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setGalleryReportTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.filterModalContent, { padding: 22 }]}>
              <Text style={[styles.modalTitle, { marginBottom: 10 }]}>
                Report Real Works content
              </Text>
              <Text style={{ color: "#555", fontSize: 14, lineHeight: 20, marginBottom: 14 }}>
                Tell us why “{galleryReportTarget?.title}” violates our
                community standards. Reports are sent to the moderation queue
                for review.
              </Text>
              <TextInput
                style={{
                  minHeight: 110,
                  maxHeight: 180,
                  backgroundColor: "#FFF",
                  borderRadius: 12,
                  padding: 12,
                  color: "#222",
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: "#DDD",
                }}
                placeholder="Describe the issue (required)"
                placeholderTextColor="#888"
                value={galleryReportReason}
                onChangeText={setGalleryReportReason}
                maxLength={1000}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Reason for reporting this work"
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={{ justifyContent: "center", paddingHorizontal: 12 }}
                  onPress={() => setGalleryReportTarget(null)}
                  disabled={submittingGalleryReport}
                >
                  <Text style={{ color: "#555", fontSize: 13, fontWeight: "700" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderRadius: 12, backgroundColor: primaryColor }}
                  onPress={submitGalleryReport}
                  disabled={submittingGalleryReport}
                >
                  <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "800" }}>
                    {submittingGalleryReport ? "Sending..." : "Submit report"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* FULLSCREEN LIGHTBOX SLIDER MODAL */}
        <Modal
          visible={isLightboxVisible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.lightboxContainer}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setIsLightboxVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>

            <FlatList
              data={galleryItems}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={activeGalleryIndex}
              getItemLayout={(_data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={styles.lightboxSlide}>
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.lightboxImage}
                    contentFit="contain"
                  />
                  <View style={styles.lightboxCaptionBox}>
                    <Text style={styles.lightboxTitle}>{item.title}</Text>
                    <Text style={styles.lightboxSub}>
                      Barber Shop Pro Collection
                    </Text>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id}
            />
          </View>
        </Modal>

        {/* --- FAVORITES MODAL SCREEN --- */}
        <Modal
          visible={isFavoritesVisible}
          animationType="slide"
          transparent={false}
        >
          <View
            style={[
              styles.homeContainer,
              { flex: 1, paddingTop: insets.top, backgroundColor: "#EFEFF4" },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setIsFavoritesVisible(false);
                  setActiveTab("home");
                }}
              >
                <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>My Favorites</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollPadding}>
              {favorites.length > 0 ? (
                <View style={styles.barberGrid}>
                  {barbers
                    .filter((b) => favorites.includes(b.id))
                    .map((item) => (
                      <BarberCard
                        key={item.id}
                        item={{ ...item, primaryColor }}
                        onPress={handleBooking}
                        onUpdateImage={handleUpdateBarberImage}
                        isFav={favorites.includes(item.id)}
                        onToggleFav={toggleFavorite}
                        isAdmin={isAdmin}
                      />
                    ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="heart-dislike-outline"
                    size={80}
                    color="#DDD"
                  />
                  <Text style={styles.emptyText}>No favorites yet</Text>
                  <TouchableOpacity
                    style={styles.browseBtn}
                    onPress={() => {
                      setIsFavoritesVisible(false);
                      setActiveTab("home");
                    }}
                  >
                    <Text style={styles.browseBtnText}>Browse Barbers</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* --- AT-HOME BARBER REQUEST MODAL --- */}
        <Modal
          visible={homeRequestVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHomeRequestVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={[styles.filterModalContent, styles.homeRequestSheet]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Barber at your home</Text>
                  <Text style={styles.homeRequestIntro}>
                    Choose a barber and send a visit request
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setHomeRequestVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.homeRequestContent}>
                  <Text style={styles.homeFieldLabel}>CHOOSE A BARBER</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.homeBarberOptions}
                  >
                    {barbers.map((barber) => {
                      const selected =
                        String(homeBarber?.id) === String(barber.id);
                      return (
                        <TouchableOpacity
                          key={String(barber.id)}
                          style={[
                            styles.homeBarberOption,
                            selected && {
                              borderColor: primaryColor,
                              backgroundColor: `${primaryColor}18`,
                            },
                          ]}
                          onPress={() => {
                            setHomeSelectedTime("");
                            setHomeSlotLoading(true);
                            setHomeBarber(barber);
                          }}
                        >
                          <Text
                            style={[
                              styles.homeBarberOptionName,
                              selected && { color: primaryColor },
                            ]}
                            numberOfLines={1}
                          >
                            {barber.name}
                          </Text>
                          <Text style={styles.homeBarberOptionPrice}>
                            {barber.price || "Ask for price"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.homeFieldLabel}>CHOOSE A DATE</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.homeDateOptions}
                  >
                    {homeDateOptions.map((date) => (
                      <TouchableOpacity
                        key={date.id}
                        style={[
                          styles.homeDateOption,
                          homeSelectedDateId === date.id && {
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                          },
                        ]}
                        onPress={() => {
                          setHomeSelectedDateId(date.id);
                          setHomeSelectedTime("");
                          if (homeBarber) setHomeSlotLoading(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.homeDateDay,
                            homeSelectedDateId === date.id &&
                              styles.homeSelectedDateText,
                          ]}
                        >
                          {date.day}
                        </Text>
                        <Text
                          style={[
                            styles.homeDateNumber,
                            homeSelectedDateId === date.id &&
                              styles.homeSelectedDateText,
                          ]}
                        >
                          {date.num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.homeFieldLabel, { marginTop: 5 }]}>
                    AVAILABLE TIMES
                  </Text>
                  {!homeBarber ? (
                    <Text style={styles.homeAvailabilityMessage}>
                      Choose a barber first to check available times.
                    </Text>
                  ) : homeSlotLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={primaryColor}
                      style={{ marginVertical: 18 }}
                    />
                  ) : homeAvailabilityError ? (
                    <View style={styles.homeAvailabilityError}>
                      <Text style={styles.homeAvailabilityErrorText}>
                        Could not check availability. Times are disabled until
                        checked.
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setHomeAvailabilityRefreshToken((value) => value + 1)
                        }
                      >
                        <Text
                          style={[
                            styles.homeRetryText,
                            { color: primaryColor },
                          ]}
                        >
                          RETRY
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.homeTimeGrid}>
                      {homeTimeOptions.map((time) => {
                        const occupied = homeBookedSlots.find(
                          (booking) => booking.booking_time === time,
                        );
                        const isUnavailable = !!occupied;
                        const isAdminBlocked =
                          occupied?.status === "Blocked" &&
                          occupied?.barber_name === "ADMIN_BLOCK";
                        return (
                          <TouchableOpacity
                            key={time}
                            disabled={isUnavailable}
                            onPress={() => setHomeSelectedTime(time)}
                            accessibilityRole="button"
                            accessibilityLabel={
                              isAdminBlocked
                                ? `${time}, locked`
                                : `${time}${isUnavailable ? ", booked" : ", available"}`
                            }
                            style={[
                              styles.homeTimeOption,
                              homeSelectedTime === time &&
                                !isUnavailable && {
                                  backgroundColor: primaryColor,
                                  borderColor: primaryColor,
                                },
                              isUnavailable &&
                                (isAdminBlocked
                                  ? styles.homeTimeBlocked
                                  : styles.homeTimeOccupied),
                            ]}
                          >
                            <Text
                              style={[
                                styles.homeTimeText,
                                homeSelectedTime === time &&
                                  !isUnavailable && { color: "#FFF" },
                                isUnavailable && {
                                  color: isAdminBlocked ? "#A87611" : "#B34B4B",
                                },
                              ]}
                            >
                              {time}
                            </Text>
                            {isUnavailable ? (
                              <View style={styles.homeUnavailableLabel}>
                                <Ionicons
                                  name={
                                    isAdminBlocked
                                      ? "lock-closed"
                                      : "close-circle"
                                  }
                                  size={10}
                                  color={isAdminBlocked ? "#A87611" : "#B34B4B"}
                                />
                                <Text
                                  style={[
                                    styles.homeUnavailableText,
                                    {
                                      color: isAdminBlocked
                                        ? "#A87611"
                                        : "#B34B4B",
                                    },
                                  ]}
                                >
                                  {isAdminBlocked ? "Closed" : "Booked"}
                                </Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <Text style={styles.homeFieldLabel}>YOUR DETAILS</Text>
                  <TextInput
                    style={styles.homeInput}
                    placeholder="Your full name"
                    placeholderTextColor="#999"
                    value={homeClientName}
                    onChangeText={setHomeClientName}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={styles.homeInput}
                    placeholder="Phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={homePhone}
                    onChangeText={setHomePhone}
                  />

                  <Text style={styles.homeFieldLabel}>VISIT LOCATION</Text>
                  <TouchableOpacity
                    style={[
                      styles.currentLocationButton,
                      { borderColor: primaryColor },
                    ]}
                    onPress={addCurrentLocation}
                    disabled={loadingHomeLocation}
                  >
                    {loadingHomeLocation ? (
                      <ActivityIndicator size="small" color={primaryColor} />
                    ) : (
                      <Ionicons
                        name="navigate-outline"
                        size={19}
                        color={primaryColor}
                      />
                    )}
                    <Text
                      style={[
                        styles.currentLocationText,
                        { color: primaryColor },
                      ]}
                    >
                      {loadingHomeLocation
                        ? "Getting your location..."
                        : homeLocationUrl
                          ? "Update my current location"
                          : "Add my current location"}
                    </Text>
                  </TouchableOpacity>
                  {homeLocationUrl ? (
                    <View style={styles.locationAddedRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#2E9D62"
                      />
                      <Text style={styles.locationAddedText}>
                        Map location added to your request
                      </Text>
                    </View>
                  ) : null}
                  <TextInput
                    style={styles.homeInput}
                    placeholder="Address (street, area, city)"
                    placeholderTextColor="#999"
                    value={homeAddress}
                    onChangeText={setHomeAddress}
                  />
                  <TextInput
                    style={[styles.homeInput, styles.homeNotesInput]}
                    placeholder="Notes (service, preferred time, etc.)"
                    placeholderTextColor="#999"
                    multiline
                    value={homeNotes}
                    onChangeText={setHomeNotes}
                  />

                  <TouchableOpacity
                    style={[
                      styles.homeWhatsAppButton,
                      (sendingHome || loadingHomeLocation) &&
                        styles.homeWhatsAppButtonDisabled,
                    ]}
                    onPress={submitHomeRequest}
                    disabled={sendingHome || loadingHomeLocation}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="Send at-home barber request on WhatsApp"
                  >
                    {sendingHome ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <View style={styles.homeWhatsAppIcon}>
                          <Ionicons
                            name="logo-whatsapp"
                            size={24}
                            color="#FFF"
                          />
                        </View>
                        <View style={styles.homeWhatsAppCopy}>
                          <Text style={styles.homeWhatsAppTitle}>
                            REQUEST ON WHATSAPP
                          </Text>
                          <Text style={styles.homeWhatsAppSubtitle}>
                            Send your visit details to confirm
                          </Text>
                        </View>
                        <View style={styles.homeWhatsAppArrow}>
                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#FFF"
                          />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.whatsappHint}>
                    WhatsApp will open with your request ready. Tap Send there
                    to deliver it.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Filter Modal */}
        <Modal visible={isFilterVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.filterModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort & Filter</Text>
                <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <View style={styles.filterOptions}>
                {["default", "rating", "price_low", "price_high"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.filterOption,
                      sortBy === opt && {
                        backgroundColor: primaryColor + "20",
                      },
                    ]}
                    onPress={() => {
                      setSortBy(opt as any);
                      setIsFilterVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === opt && { color: primaryColor },
                      ]}
                    >
                      {opt === "default"
                        ? "Recommended"
                        : opt === "rating"
                          ? "Top Rated"
                          : opt === "price_low"
                            ? "Price: Low to High"
                            : "Price: High to Low"}
                    </Text>
                    {sortBy === opt && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={primaryColor}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* --- iOS 26 STYLE FLOATING BOTTOM NAV BAR --- */}
        <View
          style={[
            styles.floatingNavContainer,
            { backgroundColor: primaryColor },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.navItem,
              activeTab === "location" && styles.activeNavItem,
            ]}
            onPress={() => {
              setActiveTab("location");
              router.push("/shop-location" as any);
            }}
          >
            <Ionicons
              name="location"
              size={24}
              color={activeTab === "location" ? "#000" : "rgba(0, 0, 0, 0.4)"}
            />
            {activeTab === "location" && (
              <View
                style={[styles.navActiveDot, { backgroundColor: "#000" }]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              activeTab === "reels" && styles.activeNavItem,
            ]}
            onPress={() => {
              setActiveTab("reels");
              router.push("/reels" as any);
            }}
          >
            <Ionicons
              name="play-circle"
              size={26}
              color={activeTab === "reels" ? "#000" : "rgba(0, 0, 0, 0.4)"}
            />
            {activeTab === "reels" && (
              <View
                style={[styles.navActiveDot, { backgroundColor: "#000" }]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              activeTab === "favorites" && styles.activeNavItem,
            ]}
            onPress={() => {
              setActiveTab("favorites");
              setIsFavoritesVisible(true);
            }}
          >
            <Ionicons
              name="heart"
              size={24}
              color={activeTab === "favorites" ? "#000" : "rgba(0, 0, 0, 0.4)"}
            />
            {activeTab === "favorites" && (
              <View
                style={[styles.navActiveDot, { backgroundColor: "#000" }]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              activeTab === "profile" && styles.activeNavItem,
            ]}
            onPress={() => {
              setActiveTab("profile");
              router.push("/profile" as any);
            }}
          >
            <Ionicons
              name="person"
              size={24}
              color={activeTab === "profile" ? "#000" : "rgba(0, 0, 0, 0.4)"}
            />
            {activeTab === "profile" && (
              <View
                style={[styles.navActiveDot, { backgroundColor: "#000" }]}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.authScreen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F5F7" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.authKeyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.authScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.authCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.authBrandRow}>
              <View style={styles.authLogoMark}>
                <FontAwesome5 name="cut" size={21} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.authBrandName}>BARBER SHOP</Text>
                <Text style={styles.authBrandCaption}>PREMIUM EXPERIENCE</Text>
              </View>
            </View>

            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTab, !isSignUpMode && styles.authTabActive]}
                onPress={() => {
                  setIsSignUpMode(false);
                  setConfirmPassword("");
                }}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.authTabText,
                    !isSignUpMode && styles.authTabTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, isSignUpMode && styles.authTabActive]}
                onPress={() => setIsSignUpMode(true)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.authTabText,
                    isSignUpMode && styles.authTabTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.authHeading}>
              {isSignUpMode ? "Create account" : "Welcome back"}
            </Text>
            <Text style={styles.authDescription}>
              {isSignUpMode
                ? "Sign up to book your next fresh look."
                : "Sign in to continue to your barber experience."}
            </Text>

            {!isSignUpMode && (
              <TouchableOpacity
                style={[styles.guestButton, { borderColor: primaryColor }]}
                onPress={() => {
                  setGuestMode(true);
                  router.replace("/home" as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Continue as Guest / تصفح كزائر"
              >
                <Text style={[styles.guestButtonText, { color: primaryColor }]}>
                  Continue as Guest · تصفح كزائر
                </Text>
              </TouchableOpacity>
            )}

            {isSignUpMode && (
              <>
                <Text style={styles.authFieldLabel}>FULL NAME</Text>
                <View style={styles.authInputRow}>
                  <Ionicons name="person-outline" size={19} color="#888" />
                  <TextInput
                    style={styles.authTextInput}
                    placeholder="Your full name"
                    placeholderTextColor="#A0A0A0"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="next"
                  />
                </View>
              </>
            )}

            <Text style={styles.authFieldLabel}>EMAIL OR PHONE NUMBER</Text>
            <View style={styles.authInputRow}>
              <Ionicons name="mail-outline" size={19} color="#888" />
              <TextInput
                style={styles.authTextInput}
                placeholder="you@example.com or 06XXXXXXXX"
                placeholderTextColor="#A0A0A0"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.authFieldLabel}>PASSWORD</Text>
            <View style={styles.authInputRow}>
              <Ionicons name="lock-closed-outline" size={19} color="#888" />
              <TextInput
                style={styles.authTextInput}
                placeholder={
                  isSignUpMode ? "Create a password" : "Enter your password"
                }
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={
                  isSignUpMode ? "new-password" : "current-password"
                }
                returnKeyType={isSignUpMode ? "next" : "done"}
                onSubmitEditing={isSignUpMode ? undefined : handleAuth}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((value) => !value)}
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={19}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            {isSignUpMode ? (
              <>
                <Text style={styles.authFieldLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.authInputRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color="#888"
                  />
                  <TextInput
                    style={styles.authTextInput}
                    placeholder="Enter your password again"
                    placeholderTextColor="#A0A0A0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((value) => !value)}
                    accessibilityLabel={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={19}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.authForgotRow}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={[styles.authForgotText, { color: primaryColor }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}

            {isSignUpMode && (
              <View style={styles.termsAgreement}>
                <TouchableOpacity
                  onPress={() => setTermsAccepted((accepted) => !accepted)}
                  accessibilityRole="checkbox"
                  accessibilityLabel="Agree to the Terms of Use and community standards"
                  accessibilityState={{ checked: termsAccepted }}
                >
                  <Ionicons
                    name={termsAccepted ? "checkbox" : "square-outline"}
                    size={20}
                    color={termsAccepted ? primaryColor : "#888"}
                  />
                </TouchableOpacity>
                <Text style={styles.termsAgreementText}>
                  I agree to the{" "}
                  <Text
                    style={{ color: primaryColor, fontWeight: "800" }}
                    onPress={() => router.push("/terms" as any)}
                  >
                    Terms of Use
                  </Text>{" "}
                  and the zero-tolerance policy for objectionable content,
                  harassment, and abusive users.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.authSubmitButton,
                { backgroundColor: primaryColor },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.authSubmitText}>
                    {isSignUpMode ? "CREATE ACCOUNT" : "SIGN IN"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.authSecureNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#888"
              />
              <Text style={styles.authSecureText}>
                Your account details are kept secure
              </Text>
            </View>
          </Animated.View>

          <Text style={styles.authFooter}>
            BARBER SHOP · LOOK SHARP, FEEL CONFIDENT
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeaderWrapper: {
    backgroundColor: "#EFEFF4",
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  container: { flex: 1, backgroundColor: "#000" },
  homeContainer: { flex: 1, backgroundColor: "#EFEFF4" },
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
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME.colors.black,
    letterSpacing: -0.5,
  },
  greetingSub: { fontSize: 14, color: "#888", marginTop: 2 },
  avatarContainer: { position: "relative" },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#EEE",
    borderWidth: 1.5,
    borderColor: "#CD813E",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFEFF4",
    marginHorizontal: 20,
    marginTop: 25,
    paddingHorizontal: 15,
    height: 65,
    borderRadius: THEME.radius.lg,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    justifyContent: "space-between",
  },
  locationLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  locationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#CD813E",
    justifyContent: "center",
    alignItems: "center",
  },
  locationTitle: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  locationSub: { fontSize: 11, color: "#888", marginTop: 2 },
  mapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapBadgeText: { color: "#CD813E", fontSize: 11, fontWeight: "bold" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#1A1A1A" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#EFEFF4",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
  },
  filterOptions: { padding: 10 },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    marginBottom: 5,
  },
  filterOptionText: { fontSize: 16, fontWeight: "600", color: "#444" },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: { fontSize: 16, color: "#999", marginTop: 15, fontWeight: "600" },
  browseBtn: {
    marginTop: 25,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseBtnText: { color: "#FFF", fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 15,
    height: 55,
    borderRadius: THEME.radius.lg,
    marginTop: 15,
    marginHorizontal: 0,
    alignItems: "center",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#000" },
  filterBtn: { padding: 5 },

  homeServiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  homeServiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  homeServiceCopy: { flex: 1, paddingRight: 8 },
  homeServiceTitle: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  homeServiceSubtitle: {
    color: "#C7C7C7",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  homeServiceAction: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  myBookingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E4E8",
    padding: 14,
    marginTop: 12,
    marginBottom: 6,
  },
  myBookingsIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F4F1ED",
    alignItems: "center",
    justifyContent: "center",
  },
  myBookingsTitle: { color: "#171717", fontSize: 14, fontWeight: "900" },
  myBookingsSubtitle: {
    color: "#777",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },

  // BANNER SLIDER STYLES
  bannerWrapper: {
    marginTop: 25,
    height: 170,
  },
  bannerContainer: {
    borderRadius: THEME.radius.xl,
    overflow: "hidden",
    height: 160,
    position: "relative",
    marginRight: 10,
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerTextContainer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
  },
  bannerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promoBadge: {
    backgroundColor: THEME.colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  clockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  clockText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  bannerTitle: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  bannerSub: { color: "#FFF", fontSize: 13, opacity: 0.9 },
  bannerBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 5,
  },
  bannerMapBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  bannerMapText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DDD",
  },
  activeDot: {
    width: 18,
    backgroundColor: THEME.colors.primary,
  },

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
  addGalleryBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
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

  galleryCardPro: {
    width: 140,
    height: 190,
    borderRadius: THEME.radius.lg,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(205, 129, 62, 0.2)",
  },
  galleryModerationActions: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    gap: 6,
    zIndex: 12,
  },
  galleryModerationButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  galleryImagePro: {
    width: "100%",
    height: "100%",
  },
  galleryGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  galleryTextWrapper: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  galleryTextPro: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },

  lightboxContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 50,
    right: 25,
    zIndex: 99,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 20,
  },
  lightboxSlide: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  lightboxImage: {
    width: "100%",
    height: "75%",
    borderRadius: 15,
  },
  lightboxCaptionBox: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  lightboxTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  lightboxSub: {
    color: THEME.colors.primary,
    fontSize: 13,
    letterSpacing: 1,
  },

  barberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  barberCard: {
    backgroundColor: "#EFEFF4",
    width: cardWidth,
    borderRadius: THEME.radius.xl,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  imageContainer: { position: "relative" },
  barberImage: { width: "100%", height: 130, borderRadius: THEME.radius.lg },
  editBarberBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CD813E",
  },
  heartBarberBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
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

  // AT-HOME SERVICE REQUEST STYLES
  homeRequestSheet: { maxHeight: "92%" },
  homeRequestIntro: { color: "#777", fontSize: 11, marginTop: 3 },
  homeRequestContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  homeFieldLabel: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 9,
  },
  homeBarberOptions: { paddingBottom: 16, gap: 9 },
  homeDateOptions: { paddingBottom: 12, gap: 8 },
  homeDateOption: {
    width: 54,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    backgroundColor: "#FFF",
  },
  homeDateDay: { color: "#888", fontSize: 9, fontWeight: "800" },
  homeDateNumber: {
    color: "#222",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  homeSelectedDateText: { color: "#FFF" },
  homeTimeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 18,
  },
  homeTimeOption: {
    width: "23%",
    minHeight: 48,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  homeTimeBlocked: {
    borderColor: "rgba(205, 145, 30, 0.35)",
    backgroundColor: "rgba(205, 145, 30, 0.08)",
  },
  homeTimeOccupied: {
    borderColor: "rgba(179, 75, 75, 0.25)",
    backgroundColor: "rgba(179, 75, 75, 0.06)",
  },
  homeTimeText: { color: "#222", fontSize: 12, fontWeight: "800" },
  homeUnavailableLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  homeUnavailableText: { fontSize: 8, fontWeight: "800" },
  homeAvailabilityMessage: { color: "#777", fontSize: 12, marginBottom: 18 },
  homeAvailabilityError: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    alignItems: "center",
    gap: 8,
  },
  homeAvailabilityErrorText: {
    color: "#9A3F3F",
    fontSize: 12,
    textAlign: "center",
  },
  homeRetryText: { fontSize: 11, fontWeight: "900" },
  homeBarberOption: {
    width: 138,
    minHeight: 65,
    padding: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    backgroundColor: "#FFF",
    justifyContent: "center",
  },
  homeBarberOptionName: { color: "#222", fontSize: 13, fontWeight: "800" },
  homeBarberOptionPrice: { color: "#777", fontSize: 11, marginTop: 4 },
  homeInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 15,
    minHeight: 50,
    marginBottom: 12,
    color: "#000",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  homeNotesInput: { height: 76, textAlignVertical: "top", paddingTop: 12 },
  currentLocationButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 9,
  },
  currentLocationText: { fontSize: 13, fontWeight: "800" },
  locationAddedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 9,
  },
  locationAddedText: { color: "#2E9D62", fontSize: 11, fontWeight: "600" },
  homeWhatsAppButton: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#128C5A",
    borderWidth: 1,
    borderColor: "#0D784C",
    shadowColor: "#0E7B50",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 5,
  },
  homeWhatsAppButtonDisabled: { opacity: 0.62 },
  homeWhatsAppIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  homeWhatsAppCopy: { flex: 1 },
  homeWhatsAppTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.45,
  },
  homeWhatsAppSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  homeWhatsAppArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  whatsappHint: {
    color: "#777",
    fontSize: 10,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 15,
  },

  noResult: {
    width: "100%",
    textAlign: "center",
    marginTop: 30,
    color: "#999",
    fontSize: 14,
  },
  authScreen: { flex: 1, backgroundColor: "#F4F5F7" },
  authKeyboardView: { flex: 1 },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  authCard: {
    width: "100%",
    maxWidth: 470,
    alignSelf: "center",
    backgroundColor: "#FFF",
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#17202A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 5,
  },
  authBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 22,
  },
  authLogoMark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#171717",
    justifyContent: "center",
    alignItems: "center",
  },
  authBrandName: {
    color: "#171717",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  authBrandCaption: {
    color: "#888",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 4,
  },
  authTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F1F2F4",
    marginBottom: 22,
  },
  authTab: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  authTabActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  authTabText: { color: "#777", fontSize: 13, fontWeight: "700" },
  authTabTextActive: { color: "#171717", fontWeight: "900" },
  authHeading: {
    color: "#171717",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  authDescription: {
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 13,
  },
  authFieldLabel: {
    color: "#6C6C6C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 7,
    marginTop: 10,
  },
  authInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#E8E9EC",
    borderRadius: 13,
    marginBottom: 4,
  },
  authTextInput: { flex: 1, height: "100%", color: "#171717", fontSize: 13 },
  authForgotRow: { alignSelf: "flex-end", paddingVertical: 8, marginBottom: 5 },
  authForgotText: { fontSize: 12, fontWeight: "800" },
  guestButton: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
  },
  guestButtonText: { fontSize: 13, fontWeight: "800" },
  termsAgreement: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 14,
  },
  termsAgreementText: {
    flex: 1,
    color: "#666",
    fontSize: 11,
    lineHeight: 16,
  },
  authSubmitButton: {
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  authSubmitText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  authSecureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
  },
  authSecureText: { color: "#888", fontSize: 10, fontWeight: "600" },
  authFooter: {
    color: "#9A9A9A",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1.1,
    marginTop: 18,
  },

  // --- FLOATING NAV BAR STYLES (iOS 26 Style) ---
  floatingNavContainer: {
    position: "absolute",
    bottom: 30,
    left: 25,
    right: 25,
    height: 70,
    backgroundColor: "#CD813E",
    borderRadius: 35,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  navItem: {
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    width: 50,
  },
  activeNavItem: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    height: 55,
    width: 55,
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1A1A1A",
    marginTop: 4,
    position: "absolute",
    bottom: 6,
  },
  // ---------------------------------------------
});
