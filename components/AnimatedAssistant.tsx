import React, { useEffect } from "react";
import { StyleSheet, View, Pressable, Text, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolateColor,
  cancelAnimation,
} from "react-native-reanimated";
import { useAssistant, AssistantState } from "@/lib/assistant-context";
import { useThemeColors } from "@/constants/colors";

const STATE_COLORS: Record<AssistantState, string> = {
  idle: "#6B7280",
  listening: "#F5A623",
  thinking: "#8B5CF6",
  speaking: "#0A7E8C",
  celebrate: "#10B981",
  pin_ack: "#EC4899",
};

const STATE_ICONS: Record<AssistantState, keyof typeof Ionicons.glyphMap> = {
  idle: "school-outline",
  listening: "ear-outline",
  thinking: "ellipsis-horizontal",
  speaking: "chatbubble-outline",
  celebrate: "sparkles",
  pin_ack: "bookmark",
};

function AssistantFace({ size, state }: { size: number; state: AssistantState }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);

  const breathe = useSharedValue(1);
  const pulse = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breathe);
    cancelAnimation(pulse);
    cancelAnimation(rotation);

    switch (state) {
      case "idle":
        breathe.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        pulse.value = withRepeat(
          withSequence(
            withTiming(0.3, { duration: 2000 }),
            withTiming(0, { duration: 2000 }),
          ),
          -1,
          true,
        );
        break;

      case "listening":
        breathe.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.9, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        pulse.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 300 }),
            withTiming(0.2, { duration: 300 }),
          ),
          -1,
          true,
        );
        break;

      case "thinking":
        breathe.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.92, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        rotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1,
          false,
        );
        break;

      case "speaking":
        breathe.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: 400, easing: Easing.out(Easing.ease) }),
            withTiming(0.96, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        pulse.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 400 }),
            withTiming(0.1, { duration: 600 }),
          ),
          -1,
          true,
        );
        break;

      case "celebrate":
        breathe.value = withRepeat(
          withSequence(
            withSpring(1.3, { damping: 4, stiffness: 200 }),
            withSpring(1, { damping: 4, stiffness: 200 }),
          ),
          3,
          true,
        );
        rotation.value = withRepeat(
          withSequence(
            withTiming(15, { duration: 150 }),
            withTiming(-15, { duration: 150 }),
            withTiming(0, { duration: 150 }),
          ),
          3,
          false,
        );
        break;

      case "pin_ack":
        breathe.value = withSequence(
          withSpring(1.2, { damping: 6, stiffness: 300 }),
          withSpring(1, { damping: 6, stiffness: 300 }),
        );
        break;
    }
  }, [state]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathe.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const color = STATE_COLORS[state];
  const icon = STATE_ICONS[state];
  const iconSize = size * 0.4;

  return (
    <View style={[faceStyles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          faceStyles.glow,
          glowStyle,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            backgroundColor: color,
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          faceStyles.body,
          bodyStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderColor: `${color}60`,
          },
        ]}
      >
        <View style={faceStyles.faceInner}>
          <View style={faceStyles.eyes}>
            <View
              style={[
                faceStyles.eye,
                {
                  width: size * 0.1,
                  height: state === "listening" ? size * 0.14 : size * 0.1,
                  borderRadius: size * 0.05,
                  backgroundColor: "#FFFFFF",
                },
              ]}
            />
            <View
              style={[
                faceStyles.eye,
                {
                  width: size * 0.1,
                  height: state === "listening" ? size * 0.14 : size * 0.1,
                  borderRadius: size * 0.05,
                  backgroundColor: "#FFFFFF",
                },
              ]}
            />
          </View>
          <Ionicons name={icon} size={iconSize} color="#FFFFFF" style={{ marginTop: size * 0.04 }} />
        </View>
      </Animated.View>
    </View>
  );
}

const faceStyles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
  },
  body: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  faceInner: {
    alignItems: "center",
  },
  eyes: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  eye: {},
});

export function LargeAssistant() {
  const { state } = useAssistant();

  return (
    <View style={largeStyles.container}>
      <AssistantFace size={80} state={state} />
    </View>
  );
}

const largeStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});

export function AssistantBubble() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const { state, isExpanded, lastMessage, setExpanded } = useAssistant();

  if (state === "idle" && !isExpanded) {
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        style={[
          bubbleStyles.bubble,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.cardShadow,
          },
        ]}
      >
        <AssistantFace size={36} state={state} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => setExpanded(!isExpanded)}
      style={[
        bubbleStyles.expandedBubble,
        {
          backgroundColor: theme.surface,
          borderColor: STATE_COLORS[state] + "40",
          shadowColor: theme.cardShadow,
        },
      ]}
    >
      <AssistantFace size={40} state={state} />
      {isExpanded && lastMessage ? (
        <View style={bubbleStyles.messageContainer}>
          <Text
            style={[bubbleStyles.stateLabel, { color: STATE_COLORS[state] }]}
          >
            {state.replace("_", " ")}
          </Text>
          <Text
            style={[bubbleStyles.messageText, { color: theme.text }]}
            numberOfLines={2}
          >
            {lastMessage}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const bubbleStyles = StyleSheet.create({
  bubble: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
  },
  expandedBubble: {
    position: "absolute",
    bottom: 100,
    right: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
    zIndex: 999,
  },
  messageContainer: {
    flex: 1,
  },
  stateLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  messageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
