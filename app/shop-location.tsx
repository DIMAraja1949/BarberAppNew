import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { MapPressEvent, Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

const ADMIN_EMAIL = "mohameddayan2@gmail.com";

const THEME = {
  colors: {
    primary: "#CD813E",
    light: "#F5F5F5",
    white: "#FFFFFF",
    black: "#1A1A1A",
    darkGrey: "#1C1C1E",
  },
  radius: { sm: 8, md: 12, lg: 15, xl: 20 },
};

// Used only until the admin saves the exact position (Beni-Mellal city center)
const DEFAULT_SHOP = {
  name: "Barber meryas",
  address: "8JPP+R8J، شارع الشابي, Beni-Mellal",
  phone: "0693222558",
  latitude: 32.3373,
  longitude: -6.3498,
};

const STATIC_INFO = {
  hours: "Mon - Sun: 10:00 AM - 10:00 PM",
  openHour: 10,
  closeHour: 22,
  instagram:
    "https://www.instagram.com/simo_dayyan?igsh=MWtscTRiNWN2aDdjaw%3D%3D&utm_source=qr",
};

type Coord = { latitude: number; longitude: number };

export default function ShopLocationScreen() {
  const router = useRouter();
  const [primaryColor, setPrimaryColor] = useState("#CD813E");
  const [isAdmin, setIsAdmin] = useState(false);

  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [hasExact, setHasExact] = useState(false);

  // Admin editor state
  const [editVisible, setEditVisible] = useState(false);
  const [dName, setDName] = useState("");
  const [dAddress, setDAddress] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dLat, setDLat] = useState("");
  const [dLng, setDLng] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);

  const loadShop = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("shop_location")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setShop({
          name: data.name || DEFAULT_SHOP.name,
          address: data.address || DEFAULT_SHOP.address,
          phone: data.phone || DEFAULT_SHOP.phone,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setHasExact(true);
      }
    } catch (e) {
      // keep defaults
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("primaryColor").then((color) => {
        if (color) setPrimaryColor(color);
      });
      loadShop();
    }, [loadShop]),
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });
  }, []);

  const hour = new Date().getHours();
  const isOpen = hour >= STATIC_INFO.openHour && hour < STATIC_INFO.closeHour;

  // ---------- Client actions ----------
  const openDirections = () => {
    const label = encodeURIComponent(shop.name);
    let url: string | undefined;
    if (hasExact) {
      const { latitude: lat, longitude: lng } = shop;
      url = Platform.select({
        ios: `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}&dirflg=d`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      });
    } else {
      const q = encodeURIComponent(shop.address);
      url = Platform.select({
        ios: `http://maps.apple.com/?q=${q}`,
        android: `geo:0,0?q=${q}`,
      });
    }
    Linking.openURL(url as string).catch(() => {
      Alert.alert("Error", "Could not open map application.");
    });
  };

  const openGoogleMaps = () => {
    const url = hasExact
      ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open Google Maps.");
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${shop.phone}`);
  };

  const handleWhatsApp = () => {
    // Formatting number for WhatsApp (adding 212 for Morocco)
    const formattedPhone = shop.phone.startsWith("0")
      ? `212${shop.phone.substring(1)}`
      : shop.phone;

    Linking.openURL(`whatsapp://send?phone=${formattedPhone}`).catch(() => {
      Linking.openURL(`https://wa.me/${formattedPhone}`);
    });
  };

  const handleInstagram = () => {
    Linking.openURL(STATIC_INFO.instagram).catch(() => {
      Alert.alert("Error", "Could not open Instagram.");
    });
  };

  // ---------- Admin editor ----------
  const parsed: Coord | null = (() => {
    const la = parseFloat(dLat.replace(",", "."));
    const ln = parseFloat(dLng.replace(",", "."));
    if (isNaN(la) || isNaN(ln)) return null;
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
    return { latitude: la, longitude: ln };
  })();

  const setPin = (c: Coord) => {
    setDLat(c.latitude.toFixed(6));
    setDLng(c.longitude.toFixed(6));
  };

  // Lets the admin paste "32.337300, -6.349800" (copied from Google Maps) in the first field
  const handleLatChange = (t: string) => {
    const m = t.match(
      /^\s*(-?\d+(?:\.\d+)?)(?:,\s+|;\s*|\s+)(-?\d+(?:\.\d+)?)\s*$/,
    );
    if (m) {
      setDLat(m[1]);
      setDLng(m[2]);
    } else {
      setDLat(t);
    }
  };

  const openEditor = () => {
    setDName(shop.name);
    setDAddress(shop.address);
    setDPhone(shop.phone);
    setDLat(hasExact ? String(shop.latitude) : "");
    setDLng(hasExact ? String(shop.longitude) : "");
    setAccuracy(null);
    setEditVisible(true);
  };

  const fillCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow location access to use this option.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const c = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setPin(c);
      setAccuracy(
        pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
      );
      mapRef.current?.animateToRegion(
        { ...c, latitudeDelta: 0.002, longitudeDelta: 0.002 },
        500,
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not get your location.");
    } finally {
      setLocating(false);
    }
  };

  const saveLocation = async () => {
    if (!parsed) {
      Alert.alert(
        "Invalid coordinates",
        "Tap the map, use your current location, or enter valid latitude / longitude.",
      );
      return;
    }
    if (!dName.trim()) {
      Alert.alert("Required", "Please enter the shop name.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        id: 1,
        name: dName.trim(),
        address: dAddress.trim(),
        phone: dPhone.trim(),
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("shop_location").upsert(payload);
      if (error) throw error;

      setShop({
        name: payload.name,
        address: payload.address,
        phone: payload.phone,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
      setHasExact(true);
      setEditVisible(false);
      Alert.alert("Saved ✅", "The shop location was updated for all clients.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Our Location</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleInstagram}>
          <Ionicons name="share-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Live Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            style={StyleSheet.absoluteFill}
            region={{
              latitude: shop.latitude,
              longitude: shop.longitude,
              latitudeDelta: hasExact ? 0.004 : 0.08,
              longitudeDelta: hasExact ? 0.004 : 0.08,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            userInterfaceStyle="dark"
          >
            {hasExact && (
              <Marker
                coordinate={{
                  latitude: shop.latitude,
                  longitude: shop.longitude,
                }}
                title={shop.name}
                pinColor={primaryColor}
              />
            )}
          </MapView>

          {/* Tap anywhere on the map to open directions */}
          <Pressable style={StyleSheet.absoluteFill} onPress={openDirections} />

          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.mapGradient}
          />

          <View pointerEvents="none" style={styles.mapInfoOverlay}>
            <View
              style={[
                styles.statusBadge,
                !isOpen && {
                  backgroundColor: "rgba(244, 67, 54, 0.2)",
                  borderColor: "rgba(244, 67, 54, 0.5)",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  !isOpen && { backgroundColor: "#F44336" },
                ]}
              />
              <Text
                style={[styles.statusText, !isOpen && { color: "#F44336" }]}
              >
                {isOpen ? "Open Now" : "Closed"}
              </Text>
            </View>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopAddressShort}>
              {!hasExact && isAdmin
                ? "Location not set yet — tap the pencil"
                : "Beni-Mellal, Morocco"}
            </Text>
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.editLocationBtn,
                { backgroundColor: primaryColor },
              ]}
              onPress={openEditor}
            >
              <Ionicons name="pencil" size={16} color="#000" />
              <Text style={styles.editLocationText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={openDirections}>
            <View style={styles.actionIconCircle}>
              <FontAwesome5 name="directions" size={20} color={primaryColor} />
            </View>
            <Text style={styles.actionLabel}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleCall}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="call" size={22} color={primaryColor} />
            </View>
            <Text style={styles.actionLabel}>Call Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleWhatsApp}>
            <View style={styles.actionIconCircle}>
              <MaterialCommunityIcons
                name="whatsapp"
                size={24}
                color={primaryColor}
              />
            </View>
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Shop Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="location-sharp"
                size={22}
                color={primaryColor}
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{shop.address}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Ionicons
                name="time-sharp"
                size={22}
                color={primaryColor}
                style={styles.infoIcon}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Opening Hours</Text>
                <Text style={styles.infoValue}>{STATIC_INFO.hours}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Ionicons
                name="logo-instagram"
                size={22}
                color={primaryColor}
                style={styles.infoIcon}
              />
              <TouchableOpacity
                style={styles.infoTextContainer}
                onPress={handleInstagram}
              >
                <Text style={styles.infoLabel}>Instagram</Text>
                <Text style={styles.infoValue}>@simo_dayyan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
          onPress={openGoogleMaps}
        >
          <Text style={styles.primaryBtnText}>View on Google Maps</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>
      </ScrollView>

      {/* ---------- ADMIN: SET SHOP LOCATION ---------- */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editSheet}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Set Shop Location</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Map picker */}
            <View style={styles.editMapWrap}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                mapType={satellite ? "hybrid" : "standard"}
                initialRegion={{
                  latitude: parsed?.latitude ?? shop.latitude,
                  longitude: parsed?.longitude ?? shop.longitude,
                  latitudeDelta: parsed ? 0.003 : 0.05,
                  longitudeDelta: parsed ? 0.003 : 0.05,
                }}
                onPress={(e: MapPressEvent) => setPin(e.nativeEvent.coordinate)}
              >
                {parsed && (
                  <Marker
                    coordinate={parsed}
                    draggable
                    onDragEnd={(e) => setPin(e.nativeEvent.coordinate)}
                    pinColor={primaryColor}
                  />
                )}
              </MapView>
              <TouchableOpacity
                style={styles.mapTypeBtn}
                onPress={() => setSatellite((s) => !s)}
              >
                <Ionicons
                  name={satellite ? "map-outline" : "earth-outline"}
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.mapTypeText}>
                  {satellite ? "Map" : "Satellite"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.hint}>
                Tap the map or drag the pin to the exact spot. Use satellite
                view to zoom on the shop entrance.
              </Text>

              <TouchableOpacity
                style={[styles.locateBtn, { borderColor: primaryColor }]}
                onPress={fillCurrentLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator color={primaryColor} />
                ) : (
                  <>
                    <Ionicons name="locate" size={18} color={primaryColor} />
                    <Text style={[styles.locateText, { color: primaryColor }]}>
                      Use my current location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {accuracy != null && (
                <Text style={styles.accuracyText}>
                  GPS accuracy: ±{accuracy} m{" "}
                  {accuracy > 20
                    ? "(go outside / wait a few seconds and retry)"
                    : "✅"}
                </Text>
              )}

              <View style={styles.coordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Latitude</Text>
                  <TextInput
                    style={styles.editInput}
                    value={dLat}
                    onChangeText={handleLatChange}
                    placeholder="32.337300"
                    placeholderTextColor="#666"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Longitude</Text>
                  <TextInput
                    style={styles.editInput}
                    value={dLng}
                    onChangeText={setDLng}
                    placeholder="-6.349800"
                    placeholderTextColor="#666"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <Text style={styles.subHint}>
                Tip: you can paste “lat, lng” copied from Google Maps in the
                Latitude field.
              </Text>

              <Text style={styles.fieldLabel}>Shop name</Text>
              <TextInput
                style={styles.editInput}
                value={dName}
                onChangeText={setDName}
                placeholder="Barber Shop"
                placeholderTextColor="#666"
              />

              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={styles.editInput}
                value={dAddress}
                onChangeText={setDAddress}
                placeholder="Street, city"
                placeholderTextColor="#666"
              />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.editInput}
                value={dPhone}
                onChangeText={setDPhone}
                placeholder="06XXXXXXXX"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: primaryColor },
                  (saving || !parsed) && { opacity: 0.6 },
                ]}
                onPress={saveLocation}
                disabled={saving || !parsed}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE LOCATION</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingBottom: 40 },
  mapContainer: {
    width: width - 40,
    height: 300,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: THEME.radius.xl,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#111",
  },
  mapGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  mapInfoOverlay: { position: "absolute", bottom: 25, left: 25, right: 25 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.5)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  statusText: { color: "#4CAF50", fontSize: 11, fontWeight: "bold" },
  shopName: { fontSize: 24, fontWeight: "900", color: "#FFF" },
  shopAddressShort: { fontSize: 14, color: "#AAA", marginTop: 4 },
  editLocationBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editLocationText: { color: "#000", fontSize: 12, fontWeight: "bold" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 25,
    paddingHorizontal: 10,
  },
  actionItem: { alignItems: "center" },
  actionIconCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: THEME.colors.darkGrey,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionLabel: { color: "#DDD", fontSize: 12, fontWeight: "600" },
  infoSection: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: THEME.colors.darkGrey,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoIcon: { marginTop: 2 },
  infoTextContainer: { flex: 1, marginLeft: 15 },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: { fontSize: 15, color: "#FFF", fontWeight: "600", lineHeight: 22 },
  infoDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 15,
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    height: 58,
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: THEME.radius.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  primaryBtnText: { color: "#000", fontSize: 16, fontWeight: "bold" },

  // ---- Admin editor ----
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  editSheet: {
    backgroundColor: THEME.colors.darkGrey,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  editTitle: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  editMapWrap: { height: 240, backgroundColor: "#111" },
  mapTypeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapTypeText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  hint: { color: "#AAA", fontSize: 13, marginBottom: 14, lineHeight: 19 },
  subHint: { color: "#777", fontSize: 11, marginTop: 6, marginBottom: 6 },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  locateText: { fontSize: 14, fontWeight: "700" },
  accuracyText: { color: "#AAA", fontSize: 12, marginBottom: 6 },
  coordRow: { flexDirection: "row", marginTop: 10 },
  fieldLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  editInput: {
    backgroundColor: "#0E0E10",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: "#FFF",
    fontSize: 15,
  },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  saveBtnText: { color: "#000", fontSize: 15, fontWeight: "bold" },
});
