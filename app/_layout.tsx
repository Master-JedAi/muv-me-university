import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { MuvProvider } from "@/lib/muv-context";
import { InteractionModeProvider, useInteractionMode } from "@/lib/interaction-mode-context";
import { AssistantProvider } from "@/lib/assistant-context";
import { startPeriodicSync, stopPeriodicSync } from "@/lib/offline-queue";
import { router } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { mode, hasChosenMode, isLoading } = useInteractionMode();

  useEffect(() => {
    if (isLoading) return;
    if (!hasChosenMode) {
      router.replace("/onboarding");
    } else if (mode === "voice_only") {
      router.replace("/voice-only");
    } else {
      router.replace("/(tabs)");
    }
  }, [hasChosenMode, mode, isLoading]);

  useEffect(() => {
    startPeriodicSync();
    return () => stopPeriodicSync();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="voice-only" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MuvProvider>
          <InteractionModeProvider>
            <AssistantProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AssistantProvider>
          </InteractionModeProvider>
        </MuvProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
