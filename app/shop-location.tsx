import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Dimensions,
    Linking,
    Alert,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

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

export default function ShopLocationScreen() {
  const router = useRouter();

  const shopDetails = {
    name: "Barber meryas",
    address: "8JPP+R8J، شارع الشابي, Beni-Mellal",
    phone: "0693222558",
    hours: "Mon - Sun: 10:00 AM - 10:00 PM",
    instagram: "https://www.instagram.com/simo_dayyan?igsh=MWtscTRiNWN2aDdjaw%3D%3D&utm_source=qr",
    plusCode: "8JPP+R8J, Beni-Mellal"
  };

  const handleOpenMap = () => {
    const query = encodeURIComponent(shopDetails.address);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`
    });

    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {
      Alert.alert("Error", "Could not open map application.");
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${shopDetails.phone}`);
  };

  const handleWhatsApp = () => {
    // Formatting number for WhatsApp (adding 212 for Morocco)
    const formattedPhone = shopDetails.phone.startsWith('0') 
      ? `212${shopDetails.phone.substring(1)}` 
      : shopDetails.phone;
    
    const url = `whatsapp://send?phone=${formattedPhone}`;
    Linking.openURL(url).catch(() => {
      // Fallback to web link if WhatsApp app is not installed
      Linking.openURL(`https://wa.me/${formattedPhone}`);
    });
  };

  const handleInstagram = () => {
    Linking.openURL(shopDetails.instagram).catch(() => {
      Alert.alert("Error", "Could not open Instagram.");
    });
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Visual Map Section */}
        <View style={styles.mapContainer}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1000&auto=format&fit=crop" }}
            style={styles.mapImage}
            contentFit="cover"
          />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={styles.mapGradient} />
          
          <View style={styles.mapInfoOverlay}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Open Now</Text>
            </View>
            <Text style={styles.shopName}>{shopDetails.name}</Text>
            <Text style={styles.shopAddressShort}>Beni-Mellal, Morocco</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={handleOpenMap}>
            <View style={styles.actionIconCircle}>
              <FontAwesome5 name="directions" size={20} color={THEME.colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleCall}>
            <View style={styles.actionIconCircle}>
              <Ionicons name="call" size={22} color={THEME.colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Call Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleWhatsApp}>
            <View style={styles.actionIconCircle}>
              <MaterialCommunityIcons name="whatsapp" size={24} color={THEME.colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Shop Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-sharp" size={22} color={THEME.colors.primary} style={styles.infoIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{shopDetails.address}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Ionicons name="time-sharp" size={22} color={THEME.colors.primary} style={styles.infoIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Opening Hours</Text>
                <Text style={styles.infoValue}>{shopDetails.hours}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Ionicons name="logo-instagram" size={22} color={THEME.colors.primary} style={styles.infoIcon} />
              <TouchableOpacity style={styles.infoTextContainer} onPress={handleInstagram}>
                <Text style={styles.infoLabel}>Instagram</Text>
                <Text style={styles.infoValue}>@simo_dayyan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Button */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenMap}>
          <Text style={styles.primaryBtnText}>View on Google Maps</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>

      </ScrollView>
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
  },
  mapImage: { width: "100%", height: "100%" },
  mapGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
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
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4CAF50", marginRight: 6 },
  statusText: { color: "#4CAF50", fontSize: 11, fontWeight: "bold" },
  shopName: { fontSize: 24, fontWeight: "900", color: "#FFF" },
  shopAddressShort: { fontSize: 14, color: "#AAA", marginTop: 4 },
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
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 15 },
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
  infoLabel: { fontSize: 12, color: "#888", fontWeight: "600", marginBottom: 4 },
  infoValue: { fontSize: 15, color: "#FFF", fontWeight: "600", lineHeight: 22 },
  infoDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 15 },
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
});
