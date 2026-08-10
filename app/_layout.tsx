import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { supabase } from "./supabaseClient";

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. التحقق واش كاينين بيانات الجلسة مخزنة مسبقاً
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    // 2. الاستماع لأي تغيير في حالة تسجيل الدخول (دخول أو خروج)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // التحكم في التوجيه التلقائي
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "" || segments[0] === "index" || segments[0] === "register";

    if (!session && !inAuthGroup) {
      // إيلا ماكانش مسجل دخولو،ديه لصفحة الـ Login (index)
      router.replace("/");
    } else if (session && inAuthGroup) {
      // إيلا كان مسجل دخولو من قبل،ديه مباشرة لصفحة home
      router.replace("/home");
    }
  }, [session, initializing, segments]);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#CD813E" />
        <Text 
          style={{ 
            color: '#CD813E', 
            marginTop: 15, 
            fontSize: 18, 
            fontWeight: 'bold', 
            letterSpacing: 1.5 
          }}
        >
          BarberApp
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="consultation" />
        <Stack.Screen name="ai-analysis" />
        <Stack.Screen name="ai-scanner" />
        <Stack.Screen name="register" />
        <Stack.Screen name="success" />
        <Stack.Screen name="reels" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}