import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
// IMPORTANT: same client as index.tsx (one Supabase client for the whole app)
import { GuestModeContext } from "../lib/guestMode";
import { supabase } from "../lib/supabase";

type StartupSplashProps = {
  exiting: boolean;
  onExitComplete: () => void;
};

function StartupSplash({ exiting, onExitComplete }: StartupSplashProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const breathing = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const exitAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });
  const breathingScale = breathing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1.015],
  });
  const breathingOpacity = breathing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  useEffect(() => {
    const intro = Animated.timing(entrance, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    intro.start(({ finished }) => {
      if (!finished) return;

      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathing, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathing, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    });

    return () => {
      intro.stop();
      pulseLoop.current?.stop();
      exitAnimation.current?.stop();
    };
  }, [breathing, entrance]);

  useEffect(() => {
    if (!exiting) return;

    pulseLoop.current?.stop();
    exitAnimation.current = Animated.parallel([
      Animated.timing(entrance, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(breathing, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]);
    exitAnimation.current.start(({ finished }) => {
      if (finished) onExitComplete();
    });
  }, [breathing, entrance, exiting, onExitComplete]);

  return (
    <View style={styles.splashOverlay}>
      <Animated.View
        style={[
          styles.logoEntrance,
          { opacity: entrance, transform: [{ scale: entranceScale }] },
        ]}
      >
        <Animated.View
          style={{
            opacity: breathingOpacity,
            transform: [{ scale: breathingScale }],
          }}
        >
          <Image
            source={require("../assets/images/splash-mark.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BarberApp logo"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function RootLayout() {
  // We only keep the user id (a string), NOT the whole session object.
  // undefined = still loading, null = logged out, string = logged in.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [guestMode, setGuestMode] = useState(false);
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const firstSegment = (segments as string[])[0];
  const handleSplashExitComplete = useCallback(() => {
    setShowStartupSplash(false);
  }, []);

  useEffect(() => {
    // 1. Check for a stored session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    // 2. Listen for login / logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      // Same user id => React ignores the update => no re-render, no redirect
      if (session?.user) setGuestMode(false);
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redirect logic
  useEffect(() => {
    if (userId === undefined) return; // still initializing

    const isPublic =
      !firstSegment ||
      ["index", "register", "terms", "privacy"].includes(firstSegment);
    const isGuestBrowsable = [
      "booking",
      "home",
      "profile",
      "reels",
      "shop-location",
    ].includes(firstSegment);

    if (userId === null && !isPublic && !(guestMode && isGuestBrowsable)) {
      router.replace("/");
    }
  }, [userId, guestMode, firstSegment]);

  return (
    <GuestModeContext.Provider value={{ guestMode, setGuestMode }}>
      <View style={styles.root}>
        <StatusBar style="light" />
        {userId !== undefined && (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="home" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="booking" />
            <Stack.Screen name="register" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="shop-location" />
            <Stack.Screen name="success" />
            <Stack.Screen name="reels" />
            {/* Admin Dashboard screen */}
            <Stack.Screen name="admin-dashboard" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        )}
        {showStartupSplash && (
          <StartupSplash
            exiting={userId !== undefined}
            onExitComplete={handleSplashExitComplete}
          />
        )}
      </View>
    </GuestModeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  logoEntrance: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
  },
});
