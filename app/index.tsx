import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    Modal,
    FlatList,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");
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

// عروض البانر المتحركة بطابع عصري 2026
const PROMO_BANNERS = [
  {
    id: "b1",
    title: "30% OFF",
    subtitle: "On your first premium booking",
    code: "WELCOME30",
    image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "b2",
    title: "VIP BEARD TRIM",
    subtitle: "Get free styling oil with every beard care",
    code: "VIPBEARD",
    image_url: "https://images.unsplash.com/photo-1622287162691-46401eff9075?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "b3",
    title: "SATURDAY SPECIAL",
    subtitle: "Book 2 services and get 15% discount",
    code: "WEEKEND15",
    image_url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1000&auto=format&fit=crop",
  },
];

const fallbackGallery = [
  {
    id: "g1",
    title: "Clean Fade Look",
    image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g2",
    title: "Classic Beard Trim",
    image_url: "https://images.unsplash.com/photo-1622287162691-46401eff9075?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g3",
    title: "VIP Styling",
    image_url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop",
  },
];

const BarberCard = ({
  item,
  onPress,
  onUpdateImage,
  isFav,
  onToggleFav,
}: {
  item: any;
  onPress: (barber: any) => void;
  onUpdateImage: (barberId: string) => void;
  isFav: boolean;
  onToggleFav: (item: any) => void;
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
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || "https://via.placeholder.com/150" }}
            style={styles.barberImage}
            contentFit="cover"
          />
          <TouchableOpacity
            style={styles.editBarberBtn}
            onPress={(e) => {
              e.stopPropagation();
              onUpdateImage(item.id);
            }}
          >
            <Ionicons name="camera" size={14} color="#FFF" />
          </TouchableOpacity>

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

  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // States for Lightbox Slider
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // State for Banner Auto Slide Index
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const bannerListRef = useRef<FlatList>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isFavoritesVisible, setIsFavoritesVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Auto scroll banners every 4 seconds
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % PROMO_BANNERS.length;
        bannerListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (session) {
      getUserProfile();
      fetchBarbers();
      fetchGallery();
      loadFavorites();
    }
  }, [session]);

  // Refresh favorites when screen is focused (returning from booking)
  useEffect(() => {
    const unsubscribe = router.canGoBack() ? () => {} : () => {
      loadFavorites();
    };
    // In expo-router, we can use navigation events if available, 
    // but a simple interval or focus check is often easier for basic sync.
    const interval = setInterval(loadFavorites, 2000);
    return () => clearInterval(interval);
  }, []);

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

        if (data?.name) setUserName(data.name.toUpperCase());
        if (data?.avatar_url) setUserAvatar(data.avatar_url);
      }
    } catch (e) {}
  };

  const handlePickAndUploadAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access camera roll is required!");
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
        .upload(filePath, arrayBuffer, { contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (!data || !data.publicUrl) throw new Error("Could not get public URL");

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setUserAvatar(publicUrl);

      await supabase.from("barbers").update({ image_url: publicUrl }).eq("name", "Simo Dayyan");
      fetchBarbers();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateBarberImage = async (barberId: string) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access camera roll is required!");
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
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`, 
          upsert: true 
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
      setBarbersLoading(true);
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
            image_url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
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
          image_url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
        },
      ]);
    } finally {
      setBarbersLoading(false);
    }
  };

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGalleryItems(data && data.length > 0 ? data : fallbackGallery);
    } catch (e) {
      setGalleryItems(fallbackGallery);
    }
  };

  const handleAddGalleryImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access camera roll is required!");
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
                const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
                const filePath = `gallery-${Date.now()}.${fileExt}`;

                const base64Response = await fetch(imageUri);
                const arrayBuffer = await base64Response.arrayBuffer();

                const { error: uploadError } = await supabase.storage
                  .from("gallery")
                  .upload(filePath, arrayBuffer, { 
                    contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`, 
                    upsert: true 
                  });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from("gallery").getPublicUrl(filePath);
                if (!data || !data.publicUrl) throw new Error("Could not get public URL");

                const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

                const { error: dbError } = await supabase.from("gallery").insert([
                  { title: titleText || "Fresh Look", image_url: publicUrl }
                ]);

                if (dbError) throw dbError;

                Alert.alert("Success", "Photo added to gallery successfully!");
                fetchGallery();
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to upload gallery item");
              } finally {
                setUploadingGallery(false);
              }
            }
          }
        ],
        "plain-text",
        "New Style"
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const filteredBarbers = useMemo(() => {
    return barbers.filter((barber) => {
      const matchesSearch = barber.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || barber.specialty === activeCategory;
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

  const openMaps = () => {
    const lat = 33.5731;
    const lng = -7.5898;
    const label = 'Barber Shop Pro';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });
    if (url) {
      Alert.alert("Opening Maps", "Navigating to: Casablanca, Morocco");
    }
  };

  async function handleAuth() {
    if (!identifier || !password || (isSignUpMode && !fullName)) {
      Alert.alert("Required", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      const isEmail = identifier.includes("@");
      const emailToUse = isEmail ? identifier.trim() : `${identifier.replace(/[^0-9]/g, "")}@barbershop.app`;
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingTitle}>HI, {userName}</Text>
              <Text style={styles.greetingSub}>Ready for a fresh look?</Text>
            </View>
            <Pressable onPress={handlePickAndUploadAvatar} style={styles.avatarContainer}>
              {uploadingAvatar ? (
                <View style={[styles.avatar, { justifyContent: "center", alignItems: "center" }]}>
                  <ActivityIndicator size="small" color="#CD813E" />
                </View>
              ) : (
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
              )}
            </Pressable>
          </View>



          {/* Search (Restored as requested) */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#999" style={{ marginRight: 10 }} />
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

          {/* DYNAMIC AUTO-SLIDING PROMO BANNERS (2026 Pro Style) */}
          <View style={styles.bannerWrapper}>
            <FlatList
              ref={bannerListRef}
              data={PROMO_BANNERS}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveBannerIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={[styles.bannerContainer, { width: width - 40 }]}>
                  <Image source={{ uri: item.image_url }} style={styles.bannerImage} contentFit="cover" />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
                    <View style={styles.bannerTextContainer}>
                      <View style={styles.bannerTopRow}>
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoBadgeText}>PROMO CODE: {item.code}</Text>
                        </View>
                        <View style={styles.clockBadge}>
                          <Ionicons name="time-outline" size={12} color="#FFF" />
                          <Text style={styles.clockText}>{currentTime}</Text>
                        </View>
                      </View>
                      <View style={styles.bannerBottomRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bannerTitle}>{item.title}</Text>
                          <Text style={styles.bannerSub}>{item.subtitle}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.bannerMapBtn} 
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
              {PROMO_BANNERS.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, activeBannerIndex === idx && styles.activeDot]}
                />
              ))}
            </View>
          </View>

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.categoryBtn, activeCategory === cat && styles.activeCategoryBtn]}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Real Works & Styles */}
          <View style={styles.sectionHeaderFlex}>
            <Text style={styles.sectionTitle}>Real Works & Styles</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
              <TouchableOpacity onPress={handleAddGalleryImage} disabled={uploadingGallery}>
                {uploadingGallery ? (
                  <ActivityIndicator size="small" color="#CD813E" />
                ) : (
                  <View style={styles.addGalleryBtn}>
                    <Ionicons name="add" size={18} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.seeAll}>View All</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList} contentContainerStyle={{ paddingRight: 10 }}>
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
                <Image source={{ uri: item.image_url }} style={styles.galleryImagePro} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.galleryGradient} />
                <View style={styles.galleryTextWrapper}>
                  <Text style={styles.galleryTextPro} numberOfLines={1}>{item.title}</Text>
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
            <ActivityIndicator color={THEME.colors.primary} size="large" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.barberGrid}>
              {filteredBarbers.length > 0 ? (
                filteredBarbers.map((item) => (
                  <BarberCard
                    key={item.id}
                    item={item}
                    onPress={handleBooking}
                    onUpdateImage={handleUpdateBarberImage} isFav={favorites.includes(item.id)} onToggleFav={toggleFavorite}
                  />
                ))
              ) : (
                <Text style={styles.noResult}>No barbers found</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* FULLSCREEN LIGHTBOX SLIDER MODAL */}
        <Modal visible={isLightboxVisible} transparent={true} animationType="fade">
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
                    <Text style={styles.lightboxSub}>Barber Shop Pro Collection</Text>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id}
            />
          </View>
        </Modal>

        {/* --- FAVORITES MODAL SCREEN --- */}
        <Modal visible={isFavoritesVisible} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.homeContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setIsFavoritesVisible(false);
                setActiveTab("home");
              }}>
                <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>My Favorites</Text>
              <View style={{ width: 28 }} />
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollPadding}>
              {favorites.length > 0 ? (
                <View style={styles.barberGrid}>
                  {barbers.filter(b => favorites.includes(b.id)).map((item) => (
                    <BarberCard
                      key={item.id}
                      item={item}
                      onPress={handleBooking}
                      onUpdateImage={handleUpdateBarberImage} isFav={favorites.includes(item.id)} onToggleFav={toggleFavorite}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="heart-dislike-outline" size={80} color="#DDD" />
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
          </SafeAreaView>
        </Modal>

        {/* --- iOS 26 STYLE FLOATING BOTTOM NAV BAR --- */}
        <View style={styles.floatingNavContainer}>
          <TouchableOpacity 
            style={[styles.navItem, activeTab === "location" && styles.activeNavItem]} 
            onPress={() => {
              setActiveTab("location");
              router.push("/shop-location" as any);
            }}
          >
            <Ionicons name="location" size={24} color={activeTab === "location" ? "#1A1A1A" : "rgba(26, 26, 26, 0.4)"} />
            {activeTab === "location" && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navItem, activeTab === "reels" && styles.activeNavItem]} 
            onPress={() => {
              setActiveTab("reels");
              router.push("/reels" as any);
            }}
          >
            <Ionicons name="play-circle" size={26} color={activeTab === "reels" ? "#1A1A1A" : "rgba(26, 26, 26, 0.4)"} />
            {activeTab === "reels" && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, activeTab === "favorites" && styles.activeNavItem]} 
            onPress={() => {
              setActiveTab("favorites");
              setIsFavoritesVisible(true);
            }}
          >
            <Ionicons name="heart" size={24} color={activeTab === "favorites" ? "#1A1A1A" : "rgba(26, 26, 26, 0.4)"} />
            {activeTab === "favorites" && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navItem, activeTab === "profile" && styles.activeNavItem]} 
            onPress={() => {
              setActiveTab("profile");
              router.push("/profile" as any);
            }}
          >
            <Ionicons name="person" size={24} color={activeTab === "profile" ? "#1A1A1A" : "rgba(26, 26, 26, 0.4)"} />
            {activeTab === "profile" && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
        </View>
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
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.authHeader}>
                <FontAwesome5 name="cut" size={36} color="#CD813E" style={styles.logoIcon} />
                <Text style={styles.authTitle}>Barber Shop</Text>
                <Text style={styles.authSubtitle}>PREMIUM EXPERIENCE</Text>
              </View>

              <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={styles.welcomeTitle}>{isSignUpMode ? "Create Account" : "Welcome back"}</Text>
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

                <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.7 }]} onPress={handleAuth} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.loginButtonText}>{isSignUpMode ? "SIGN UP →" : "LOG IN →"}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.switchModeContainer} onPress={() => setIsSignUpMode(!isSignUpMode)}>
                  <Text style={styles.switchText}>
                    {isSignUpMode ? "Already have an account? " : "Don't have an account? "}
                    <Text style={styles.switchLink}>{isSignUpMode ? "Log In" : "Sign Up"}</Text>
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
    borderColor: THEME.colors.primary,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
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
  mapBadgeText: { color: THEME.colors.primary, fontSize: 11, fontWeight: "bold" },
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
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 },
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
    marginHorizontal: 20,
    alignItems: "center",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#000" },
  filterBtn: { padding: 5 },
  
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
  bannerTextContainer: { position: "absolute", bottom: 15, left: 20, right: 20 },
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

  consultationCard: {
    backgroundColor: "#FFF",
    marginTop: 15,
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
    backgroundColor: "#FFF",
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

  // --- FLOATING NAV BAR STYLES (iOS 26 Style) ---
  floatingNavContainer: {
    position: "absolute",
    bottom: 30,
    left: 25,
    right: 25,
    height: 70,
    backgroundColor: "#CD813E", // Solid primary color for better visibility
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