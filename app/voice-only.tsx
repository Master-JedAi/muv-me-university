import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  cancelAnimation,
  SharedValue,
} from "react-native-reanimated";
import { useMuv } from "@/lib/muv-context";
import { useThemeColors } from "@/constants/colors";
import { useInteractionMode } from "@/lib/interaction-mode-context";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const MAX_RADIUS = Math.sqrt(CENTER_X * CENTER_X + CENTER_Y * CENTER_Y);

function RippleRing({
  progress,
  direction,
  index,
  color,
}: {
  progress: SharedValue<number>;
  direction: "outward" | "inward";
  index: number;
  color: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const delay = index * 0.15;
    const adjustedProgress = Math.max(0, Math.min(1, progress.value - delay));

    let radius: number;
    let opacity: number;

    if (direction === "outward") {
      radius = interpolate(adjustedProgress, [0, 1], [40, MAX_RADIUS * 0.9]);
      opacity = interpolate(adjustedProgress, [0, 0.2, 0.7, 1], [0, 0.5, 0.3, 0]);
    } else {
      radius = interpolate(adjustedProgress, [0, 1], [MAX_RADIUS * 0.9, 40]);
      opacity = interpolate(adjustedProgress, [0, 0.2, 0.7, 1], [0, 0.4, 0.35, 0]);
    }

    return {
      width: radius * 2,
      height: radius * 2,
      borderRadius: radius,
      opacity,
      borderWidth: interpolate(adjustedProgress, [0, 1], [3, 1.5]),
      borderColor: color,
      backgroundColor: `${color}08`,
    };
  });

  return (
    <Animated.View
      style={[styles.rippleRing, animatedStyle]}
      pointerEvents="none"
    />
  );
}

function CenterOrb({
  isActive,
  isAiSpeaking,
  isUserSpeaking,
  theme,
}: {
  isActive: boolean;
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const breathe = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      breathe.value = withTiming(1, { duration: 600 });
      glow.value = withTiming(0, { duration: 600 });
    }
  }, [isActive]);

  const orbStyle = useAnimatedStyle(() => {
    const size = 100;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ scale: breathe.value }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const size = 140;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity: glow.value * 0.4,
    };
  });

  const orbColor = isUserSpeaking
    ? theme.accent
    : isAiSpeaking
      ? theme.primary
      : theme.textMuted;

  return (
    <View style={styles.orbContainer}>
      <Animated.View
        style={[
          styles.orbGlow,
          glowStyle,
          { backgroundColor: orbColor },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.orb,
          orbStyle,
          {
            backgroundColor: orbColor,
            borderColor: `${orbColor}40`,
          },
        ]}
      >
        <Ionicons
          name={isUserSpeaking ? "mic" : isAiSpeaking ? "volume-high" : "mic-outline"}
          size={36}
          color="#FFFFFF"
        />
      </Animated.View>
    </View>
  );
}

export default function VoiceOnlyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const { orchestrate } = useMuv();
  const { resetMode } = useInteractionMode();

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Tap the orb to start speaking");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userRippleProgress = useSharedValue(0);
  const aiRippleProgress = useSharedValue(0);

  const RING_COUNT = 6;

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (recordingRef.current)
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startUserRipple = useCallback(() => {
    userRippleProgress.value = 0;
    userRippleProgress.value = withRepeat(
      withTiming(1 + RING_COUNT * 0.15, {
        duration: 2400,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false,
    );
  }, []);

  const stopUserRipple = useCallback(() => {
    cancelAnimation(userRippleProgress);
    userRippleProgress.value = withTiming(0, { duration: 400 });
  }, []);

  const triggerAiRipple = useCallback(() => {
    setIsAiSpeaking(true);
    aiRippleProgress.value = 0;
    aiRippleProgress.value = withRepeat(
      withTiming(1 + RING_COUNT * 0.15, {
        duration: 2800,
        easing: Easing.out(Easing.ease),
      }),
      3,
      false,
    );
    setTimeout(() => {
      setIsAiSpeaking(false);
      cancelAnimation(aiRippleProgress);
      aiRippleProgress.value = withTiming(0, { duration: 400 });
    }, 8400);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!permissionResponse?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setStatusText("Microphone access needed. Check your device settings.");
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsUserSpeaking(true);
      setRecordingDuration(0);
      setStatusText("Listening...");

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      startUserRipple();
    } catch (err) {
      console.error("Failed to start recording:", err);
      setStatusText("Could not start recording. Try again.");
    }
  }, [permissionResponse, requestPermission, startUserRipple]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    stopUserRipple();
    setIsUserSpeaking(false);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri && recordingDuration >= 1) {
        setIsProcessing(true);
        setStatusText("Processing your voice...");

        try {
          const result = await orchestrate(
            `[Voice input captured - ${recordingDuration}s recording]`,
          );
          setStatusText(result.message);
          triggerAiRipple();
        } catch {
          setStatusText("Something went wrong. Tap to try again.");
        }
        setIsProcessing(false);
      } else {
        setStatusText("Hold longer to record. Tap to try again.");
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
      recordingRef.current = null;
      setStatusText("Recording error. Tap to try again.");
    }
    setRecordingDuration(0);
  }, [recordingDuration, orchestrate, stopUserRipple, triggerAiRipple]);

  const handleOrbPress = useCallback(async () => {
    if (isProcessing) return;
    if (isUserSpeaking) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isUserSpeaking, isProcessing, startRecording, stopRecording]);

  const handleExit = useCallback(async () => {
    await resetMode();
    router.replace("/onboarding");
  }, [resetMode]);

  const bgColor = isDark ? "#060D1A" : "#0A0F1C";
  const userRippleColor = isDark ? "#F5A623" : "#F5A623";
  const aiRippleColor = isDark ? "#14B8C8" : "#0A7E8C";

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <RippleRing
          key={`user-${i}`}
          progress={userRippleProgress}
          direction="inward"
          index={i}
          color={userRippleColor}
        />
      ))}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <RippleRing
          key={`ai-${i}`}
          progress={aiRippleProgress}
          direction="outward"
          index={i}
          color={aiRippleColor}
        />
      ))}

      <Pressable
        onPress={handleOrbPress}
        style={StyleSheet.absoluteFill}
        disabled={isProcessing}
      >
        <View style={styles.centerArea}>
          <CenterOrb
            isActive={isUserSpeaking || isAiSpeaking}
            isAiSpeaking={isAiSpeaking}
            isUserSpeaking={isUserSpeaking}
            theme={theme}
          />
        </View>
      </Pressable>

      <View
        style={[
          styles.statusArea,
          {
            bottom: Platform.OS === "web" ? 34 + 60 : insets.bottom + 60,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color: isUserSpeaking
                ? userRippleColor
                : isAiSpeaking
                  ? aiRippleColor
                  : "rgba(255,255,255,0.6)",
            },
          ]}
          numberOfLines={3}
        >
          {statusText}
        </Text>

        {isUserSpeaking && (
          <Text style={styles.durationText}>
            {Math.floor(recordingDuration / 60)}:
            {(recordingDuration % 60).toString().padStart(2, "0")}
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleExit}
        style={[
          styles.exitButton,
          {
            top: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
          },
        ]}
        hitSlop={12}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  rippleRing: {
    position: "absolute",
    alignSelf: "center",
  },
  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  orbContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  orbGlow: {
    position: "absolute",
  },
  orb: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  statusArea: {
    position: "absolute",
    left: 40,
    right: 40,
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  durationText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  exitButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
