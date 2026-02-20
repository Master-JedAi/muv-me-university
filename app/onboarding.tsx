import React, { useRef } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useInteractionMode, InteractionMode } from "@/lib/interaction-mode-context";
import { useThemeColors } from "@/constants/colors";
import { router } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ModeOption {
  mode: InteractionMode;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  description: string;
}

const MODES: ModeOption[] = [
  {
    mode: "voice_only",
    title: "Voice Only",
    subtitle: "Pure immersion",
    icon: "radio-outline",
    gradient: ["#0A7E8C", "#065A64"],
    description:
      "Speak to learn. A flowing ripple responds to your voice and the AI. No buttons, no distractions.",
  },
  {
    mode: "voice_text",
    title: "Voice + Text",
    subtitle: "Best of both",
    icon: "chatbubbles-outline",
    gradient: ["#6366F1", "#4338CA"],
    description:
      "Voice-controlled with conversation bubbles so you can track the dialogue. Toggle keyboard on or off.",
  },
  {
    mode: "click_only",
    title: "Click / Touch",
    subtitle: "Classic navigation",
    icon: "hand-left-outline",
    gradient: ["#F59E0B", "#D97706"],
    description:
      "Navigate with taps and swipes. Full control with traditional menus and buttons.",
  },
  {
    mode: "any",
    title: "Any / All",
    subtitle: "Maximum flexibility",
    icon: "sparkles-outline",
    gradient: ["#EC4899", "#BE185D"],
    description:
      "Switch freely between voice, text, and touch. Every input method available at all times.",
  },
];

function AnimatedModeCard({
  option,
  index,
  onSelect,
}: {
  option: ModeOption;
  index: number;
  onSelect: (mode: InteractionMode) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    scale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 120 }),
    );
    setTimeout(() => onSelect(option.mode), 200);
  };

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 120).duration(500)}>
      <Pressable onPress={handlePress}>
        <Animated.View style={[styles.card, animStyle]}>
          <LinearGradient
            colors={option.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardIconWrap}>
                <Ionicons name={option.icon} size={26} color="#FFF" />
              </View>
              <View style={styles.cardTitles}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255,255,255,0.6)"
              />
            </View>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const { setMode } = useInteractionMode();

  const handleSelect = async (selectedMode: InteractionMode) => {
    await setMode(selectedMode);
    if (selectedMode === "voice_only") {
      router.replace("/voice-only");
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#060D1A" : "#F0F4F8",
          paddingTop: Platform.OS === "web" ? 67 + 24 : insets.top + 24,
          paddingBottom: Platform.OS === "web" ? 34 + 16 : insets.bottom + 16,
        },
      ]}
    >
      <Animated.View
        entering={FadeIn.duration(600)}
        style={styles.headerSection}
      >
        <Text
          style={[
            styles.brandMark,
            { color: theme.primary },
          ]}
        >
          MUV
        </Text>
        <Text
          style={[styles.headerTitle, { color: theme.text }]}
        >
          How would you like{"\n"}to interact?
        </Text>
        <Text
          style={[styles.headerSub, { color: theme.textSecondary }]}
        >
          Choose your preferred way to learn. You can change this anytime in
          settings.
        </Text>
      </Animated.View>

      <View style={styles.cardsSection}>
        {MODES.map((option, index) => (
          <AnimatedModeCard
            key={option.mode}
            option={option}
            index={index}
            onSelect={handleSelect}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerSection: {
    marginBottom: 28,
  },
  brandMark: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 4,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 8,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  cardsSection: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 18,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitles: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  cardDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },
});
