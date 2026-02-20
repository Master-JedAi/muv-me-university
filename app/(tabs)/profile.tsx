import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  useColorScheme,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useMuv } from "@/lib/muv-context";
import { useThemeColors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useInteractionMode, InteractionMode } from "@/lib/interaction-mode-context";
import { router } from "expo-router";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const {
    learner,
    mastery,
    weakPoints,
    evidence,
    courses,
    pins,
    refreshAll,
  } = useMuv();
  const { mode, resetMode } = useInteractionMode();

  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(learner?.displayName || "Learner");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, []);

  const handleSaveName = async () => {
    if (!learner || !nameInput.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await apiRequest("PUT", `/api/learner/${learner.id}`, {
        displayName: nameInput.trim(),
      });
      await refreshAll();
      setEditing(false);
    } catch (err) {
      console.error("Failed to update name:", err);
    }
  };

  const avgMastery =
    mastery.length > 0
      ? mastery.reduce((sum, m) => sum + m.score, 0) / mastery.length
      : 0;

  const avgStability =
    mastery.length > 0
      ? mastery.reduce((sum, m) => sum + m.stability, 0) / mastery.length
      : 0;

  const stats = [
    {
      icon: "book-outline" as const,
      label: "Courses",
      value: courses.length.toString(),
      color: theme.primary,
    },
    {
      icon: "bulb-outline" as const,
      label: "Concepts",
      value: mastery.length.toString(),
      color: theme.accent,
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: "Evidence",
      value: evidence.length.toString(),
      color: theme.success,
    },
    {
      icon: "warning-outline" as const,
      label: "Weak Points",
      value: weakPoints.length.toString(),
      color: theme.warning,
    },
    {
      icon: "bookmark-outline" as const,
      label: "Pins",
      value: pins.length.toString(),
      color: "#8B5CF6",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 80 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <LinearGradient
          colors={isDark ? ["#0E3D44", "#0A2A3C"] : ["#0A7E8C", "#0B6B78"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#FFF" />
            </View>
          </View>

          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <Pressable onPress={handleSaveName} hitSlop={12}>
                <Ionicons name="checkmark" size={24} color="#FFF" />
              </Pressable>
              <Pressable onPress={() => setEditing(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setNameInput(learner?.displayName || "Learner");
                setEditing(true);
              }}
              style={styles.nameRow}
            >
              <Text style={styles.profileName}>
                {learner?.displayName || "Learner"}
              </Text>
              <Ionicons name="pencil-outline" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}

          <Text style={styles.memberSince}>
            Member since{" "}
            {learner?.createdAt
              ? new Date(learner.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "--"}
          </Text>
        </LinearGradient>

        <View style={styles.masteryOverview}>
          <View
            style={[
              styles.masteryCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.masteryValue, { color: theme.primary }]}>
              {Math.round(avgMastery * 100)}%
            </Text>
            <Text style={[styles.masteryLabel, { color: theme.textSecondary }]}>
              Avg Mastery
            </Text>
          </View>
          <View
            style={[
              styles.masteryCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.masteryValue, { color: theme.success }]}>
              {Math.round(avgStability * 100)}%
            </Text>
            <Text style={[styles.masteryLabel, { color: theme.textSecondary }]}>
              Avg Stability
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name={stat.icon} size={22} color={stat.color} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Interaction Mode
          </Text>
          <Pressable
            onPress={async () => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              await resetMode();
              router.replace("/onboarding");
            }}
            style={[
              styles.modeCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={
                mode === "voice_only"
                  ? "radio-outline"
                  : mode === "voice_text"
                    ? "chatbubbles-outline"
                    : mode === "click_only"
                      ? "hand-left-outline"
                      : "sparkles-outline"
              }
              size={22}
              color={theme.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: theme.text }]}>
                {mode === "voice_only"
                  ? "Voice Only"
                  : mode === "voice_text"
                    ? "Voice + Text"
                    : mode === "click_only"
                      ? "Click / Touch"
                      : "Any / All"}
              </Text>
              <Text style={[styles.modeSubtitle, { color: theme.textMuted }]}>
                Tap to change
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            About MUV
          </Text>
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
              MUV (Me Uni-Versity) is your personal adaptive learning platform.
              Speak your goals into existence, and the system will create
              courses, quizzes, and games tailored to your learning needs.
            </Text>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>
                Version
              </Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>
                1.0.0 (Prototype)
              </Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>
                Voice Mode
              </Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>
                Option B (Transcription)
              </Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>
                Plugins
              </Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>
                Quiz, Game, Search
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  profileHeader: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: { marginBottom: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFF",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nameInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.5)",
    paddingBottom: 4,
    minWidth: 120,
    textAlign: "center" as const,
  },
  memberSince: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
  },
  masteryOverview: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  masteryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  masteryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  masteryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: "30%",
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 10,
  },
  aboutCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  aboutText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginVertical: 14,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  aboutLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  aboutValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  modeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  modeSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
