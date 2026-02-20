import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  TextInput,
  useColorScheme,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Keyboard,
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
  Easing,
} from "react-native-reanimated";
import { useMuv } from "@/lib/muv-context";
import { useThemeColors } from "@/constants/colors";
import { useInteractionMode } from "@/lib/interaction-mode-context";
import { useAssistant } from "@/lib/assistant-context";
import { LargeAssistant } from "@/components/AnimatedAssistant";
import { enqueueEvent } from "@/lib/offline-queue";

interface TranscriptEntry {
  id: string;
  text: string;
  role: "user" | "assistant";
  intent?: string;
  timestamp: Date;
}

export default function SpeakScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const { orchestrate, createPin } = useMuv();
  const { mode, keyboardEnabled, setKeyboardEnabled } = useInteractionMode();
  const { setState: setAssistantState, setLastMessage } = useAssistant();

  const showKeyboard = mode === "voice_text" ? keyboardEnabled : true;

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [history, setHistory] = useState<TranscriptEntry[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!permissionResponse?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
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
      setIsRecording(true);
      setRecordingDuration(0);
      setAssistantState("listening");

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [permissionResponse, requestPermission]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    pulseScale.value = withTiming(1, { duration: 200 });
    setIsRecording(false);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri && recordingDuration >= 1) {
        await sendTranscript(`[Voice - ${recordingDuration}s]`);
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
      recordingRef.current = null;
    }
    setRecordingDuration(0);
  }, [recordingDuration]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const openSettings = useCallback(() => {
    try {
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else if (Platform.OS === "android") {
        Linking.openSettings();
      }
    } catch (err) {
      console.error("Failed to open settings:", err);
    }
  }, []);

  const sendTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsProcessing(true);
      setAssistantState("thinking");
      const entryId =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const userEntry: TranscriptEntry = {
        id: entryId,
        text: text.trim(),
        role: "user",
        timestamp: new Date(),
      };
      setHistory((prev) => [...prev, userEntry]);
      setTextInput("");
      Keyboard.dismiss();

      enqueueEvent({
        eventType: "user_message",
        payload: { text: text.trim() },
      });

      try {
        const result = await orchestrate(text.trim());
        setAssistantState("speaking");
        setLastMessage(result.message);
        const aiEntry: TranscriptEntry = {
          id: entryId + "_resp",
          text: result.message,
          role: "assistant",
          intent: result.intent,
          timestamp: new Date(),
        };
        setHistory((prev) => [...prev, aiEntry]);
        setTimeout(() => setAssistantState("idle"), 3000);
      } catch (err) {
        setAssistantState("idle");
        const errorEntry: TranscriptEntry = {
          id: entryId + "_err",
          text: "Something went wrong. Please try again.",
          role: "assistant",
          timestamp: new Date(),
        };
        setHistory((prev) => [...prev, errorEntry]);
      }
      setIsProcessing(false);
    },
    [orchestrate],
  );

  const { triggerPinAck } = useAssistant();

  const handlePinFromHistory = useCallback(
    async (text: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await createPin(text, "speak_history");
      triggerPinAck();
      enqueueEvent({
        eventType: "pin_created",
        payload: { content: text, source: "speak_history" },
      });
    },
    [createPin, triggerPinAck],
  );

  const intentColor = (intent?: string) => {
    switch (intent) {
      case "create_course":
        return theme.primary;
      case "run_placement_quiz":
      case "final_exam":
        return theme.accent;
      case "generate_games":
        return theme.success;
      case "pin":
        return theme.warning;
      case "search":
        return "#8B5CF6";
      default:
        return theme.textMuted;
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const needsPermission =
    permissionResponse &&
    !permissionResponse.granted &&
    permissionResponse.status === "denied" &&
    !permissionResponse.canAskAgain;

  const renderItem = useCallback(
    ({ item }: { item: TranscriptEntry }) => {
      if (item.role === "user") {
        return (
          <View style={styles.entryContainer}>
            <View
              style={[
                styles.userBubble,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.userBubbleText}>{item.text}</Text>
            </View>
          </View>
        );
      }
      return (
        <View style={styles.entryContainer}>
          <View style={styles.responseBubbleRow}>
            <View
              style={[
                styles.responseBubble,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {item.intent && item.intent !== "unknown" && (
                <View
                  style={[
                    styles.intentBadge,
                    {
                      backgroundColor: intentColor(item.intent) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.intentText,
                      { color: intentColor(item.intent) },
                    ]}
                  >
                    {item.intent.replace(/_/g, " ")}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.responseText, { color: theme.text }]}
              >
                {item.text}
              </Text>
              <Pressable
                onPress={() => handlePinFromHistory(item.text)}
                style={styles.pinAction}
                hitSlop={8}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={16}
                  color={theme.textMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [theme, handlePinFromHistory],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <LargeAssistant />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Speak It Into Existence
            </Text>
            <Text
              style={[styles.headerSub, { color: theme.textSecondary }]}
            >
              Say what you want to learn
            </Text>
          </View>
          {mode === "voice_text" && (
            <Pressable
              onPress={() => setKeyboardEnabled(!keyboardEnabled)}
              style={[
                styles.keyboardToggle,
                {
                  backgroundColor: keyboardEnabled
                    ? theme.primary + "20"
                    : theme.surfaceSecondary,
                },
              ]}
            >
              <Ionicons
                name={keyboardEnabled ? "keyboard" : "keyboard-outline"}
                size={20}
                color={keyboardEnabled ? theme.primary : theme.textMuted}
              />
            </Pressable>
          )}
        </View>
      </View>

      {needsPermission && Platform.OS !== "web" && (
        <View
          style={[
            styles.permissionBanner,
            { backgroundColor: theme.warningLight },
          ]}
        >
          <Ionicons name="mic-off-outline" size={18} color={theme.warning} />
          <Text style={[styles.permissionText, { color: theme.warning }]}>
            Microphone access was denied. Enable it in Settings to use voice.
          </Text>
          <Pressable
            onPress={openSettings}
            style={[
              styles.settingsButton,
              { backgroundColor: theme.warning },
            ]}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.historyContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={44}
              color={theme.textMuted}
            />
            <Text
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              Try saying or typing:
            </Text>
            <View style={styles.suggestions}>
              {[
                "Teach me about quantum physics",
                "Quiz me on JavaScript",
                "Pin linear algebra for later",
                "Search for machine learning",
              ].map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.suggestion,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => sendTranscript(s)}
                >
                  <Text
                    style={[styles.suggestionText, { color: theme.text }]}
                  >
                    {s}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={theme.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={
          isProcessing ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text
                style={[
                  styles.processingText,
                  { color: theme.textMuted },
                ]}
              >
                Thinking...
              </Text>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.inputArea,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8,
          },
        ]}
      >
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View
              style={[
                styles.recordingDot,
                { backgroundColor: theme.danger },
              ]}
            />
            <Text style={[styles.recordingText, { color: theme.danger }]}>
              Recording {formatDuration(recordingDuration)}
            </Text>
            <Text
              style={[styles.recordingHint, { color: theme.textMuted }]}
            >
              Tap mic to stop
            </Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <Animated.View style={pulseStyle}>
            <Pressable
              onPress={handleMicPress}
              disabled={isProcessing}
              style={({ pressed }) => [
                styles.micButton,
                {
                  backgroundColor: isRecording
                    ? theme.danger
                    : pressed
                      ? theme.primaryLight
                      : theme.surfaceSecondary,
                },
              ]}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic-outline"}
                size={22}
                color={isRecording ? "#FFF" : theme.primary}
              />
            </Pressable>
          </Animated.View>
          {showKeyboard && (
            <>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Type a command..."
                placeholderTextColor={theme.textMuted}
                value={textInput}
                onChangeText={setTextInput}
                onSubmitEditing={() => sendTranscript(textInput)}
                returnKeyType="send"
                editable={!isProcessing && !isRecording}
              />
              <Pressable
                onPress={() => sendTranscript(textInput)}
                disabled={!textInput.trim() || isProcessing || isRecording}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor:
                      textInput.trim() && !isProcessing && !isRecording
                        ? theme.primary
                        : theme.surfaceSecondary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    textInput.trim() && !isRecording
                      ? "#FFF"
                      : theme.textMuted
                  }
                />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  keyboardToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  permissionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingsButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
  historyContent: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
    flex: 1,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  suggestions: { width: "100%", gap: 8, marginTop: 12 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  entryContainer: { marginTop: 12 },
  userBubble: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: "80%",
  },
  userBubbleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#FFFFFF",
  },
  responseBubbleRow: { alignSelf: "flex-start", maxWidth: "85%" },
  responseBubble: {
    padding: 14,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  intentBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  intentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "capitalize" as const,
  },
  responseText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  pinAction: {
    alignSelf: "flex-end",
    marginTop: 6,
  },
  loadingBubble: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  processingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  inputArea: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  recordingHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    textAlign: "right" as const,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
