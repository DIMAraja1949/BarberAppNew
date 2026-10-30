import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

const COLORS = {
  background: "#F4F5F7",
  white: "#FFFFFF",
  ink: "#171717",
  muted: "#7A7A7A",
  border: "#E8E9EC",
  input: "#F7F7F8",
  accent: "#CD813E",
};

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-18);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(22);
  const buttonScale = useSharedValue(0.96);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    formOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }),
    );
    formTranslateY.value = withDelay(
      120,
      withSpring(0, { damping: 15, stiffness: 100 }),
    );
    buttonOpacity.value = withDelay(250, withTiming(1, { duration: 450 }));
    buttonScale.value = withDelay(
      250,
      withSpring(1, { damping: 13, stiffness: 120 }),
    );
  }, []);

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));
  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.98, { damping: 14, stiffness: 200 });
  };
  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 14, stiffness: 200 });
  };

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const cleanIdentifier = identifier.trim();

    if (!cleanName || !cleanIdentifier || !password || !confirmPassword) {
      Alert.alert("Required", "Please complete all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "Please make sure both passwords are the same.",
      );
      return;
    }
    if (!termsAccepted) {
      Alert.alert(
        "Terms required",
        "Please agree to the Terms of Use and community standards before creating an account.",
      );
      return;
    }

    setLoading(true);
    try {
      const isEmail = cleanIdentifier.includes("@");
      const phoneDigits = cleanIdentifier.replace(/[^0-9]/g, "");
      const email = isEmail ? cleanIdentifier : `${phoneDigits}@barberapp.com`;
      const phone = isEmail ? null : cleanIdentifier;

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      if (data.user) {
        // The home screen reads profiles.name, so keep registration on that same column.
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            name: cleanName,
            phone,
            email,
          },
          { onConflict: "id" },
        );
        if (profileError) throw profileError;
      }

      Alert.alert(
        "Account created",
        "Your account has been created successfully.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/profile" as any),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Sign-up failed",
        error.message || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.brandHeader, animatedHeaderStyle]}>
            <View style={styles.logoMark}>
              <FontAwesome5 name="cut" size={22} color={COLORS.accent} />
            </View>
            <Text style={styles.brandName}>BARBER SHOP</Text>
            <Text style={styles.brandCaption}>
              A PREMIUM GROOMING EXPERIENCE
            </Text>
          </Animated.View>

          <Animated.View style={[styles.card, animatedFormStyle]}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={styles.segment}
                onPress={() => router.push("/login" as any)}
                accessibilityRole="button"
              >
                <Text style={styles.segmentText}>Sign In</Text>
              </TouchableOpacity>
              <View style={[styles.segment, styles.segmentActive]}>
                <Text style={[styles.segmentText, styles.segmentActiveText]}>
                  Sign Up
                </Text>
              </View>
            </View>

            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.description}>
              Join us and book your next fresh look.
            </Text>

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
                  color={termsAccepted ? COLORS.accent : COLORS.muted}
                />
              </TouchableOpacity>
              <Text style={styles.termsAgreementText}>
                I agree to the{" "}
                <Text
                  style={{ color: COLORS.accent, fontWeight: "800" }}
                  onPress={() => router.push("/terms" as any)}
                >
                  Terms of Use
                </Text>
                {" "}and the zero-tolerance policy for objectionable content,
                harassment, and abusive users.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "fullName" && styles.inputFocused,
              ]}
            >
              <Ionicons name="person-outline" size={19} color={COLORS.muted} />
              <TextInput
                style={styles.textInput}
                placeholder="Your full name"
                placeholderTextColor="#A1A1A1"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedInput("fullName")}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.fieldLabel}>EMAIL OR PHONE NUMBER</Text>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "identifier" && styles.inputFocused,
              ]}
            >
              <Ionicons name="mail-outline" size={19} color={COLORS.muted} />
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com or 06XXXXXXXX"
                placeholderTextColor="#A1A1A1"
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => setFocusedInput("identifier")}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "password" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={COLORS.muted}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Create a password"
                placeholderTextColor="#A1A1A1"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
                autoComplete="new-password"
                returnKeyType="next"
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
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <View
              style={[
                styles.inputContainer,
                focusedInput === "confirmPassword" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={COLORS.muted}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password again"
                placeholderTextColor="#A1A1A1"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedInput("confirmPassword")}
                onBlur={() => setFocusedInput(null)}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
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
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={19}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            <Animated.View style={[styles.buttonWrapper, animatedButtonStyle]}>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Create account</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={COLORS.white}
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.securityNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#8B8B8B"
              />
              <Text style={styles.securityText}>
                Your information is kept secure
              </Text>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/login" as any)}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  brandHeader: { alignItems: "center", marginBottom: 22 },
  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.ink,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  brandName: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  brandCaption: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 5,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.035)",
    shadowColor: "#17202A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F1F2F4",
    marginBottom: 22,
  },
  segment: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  segmentActiveText: { color: COLORS.ink, fontWeight: "900" },
  heading: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  description: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 17,
  },
  termsAgreement: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 8,
  },
  termsAgreementText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  fieldLabel: {
    color: "#6C6C6C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 7,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 14,
    gap: 10,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
  },
  inputFocused: { borderColor: COLORS.accent, backgroundColor: COLORS.white },
  textInput: { flex: 1, height: "100%", color: COLORS.ink, fontSize: 13 },
  buttonWrapper: { marginTop: 22 },
  button: {
    height: 54,
    borderRadius: 15,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
  },
  securityText: { color: "#8B8B8B", fontSize: 10, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 20,
  },
  footerText: { color: COLORS.muted, fontSize: 12 },
  footerLink: { color: COLORS.accent, fontSize: 12, fontWeight: "900" },
});
