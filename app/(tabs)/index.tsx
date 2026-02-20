import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useMuv } from "@/lib/muv-context";
import { useThemeColors } from "@/constants/colors";

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const {
    learner,
    isLoading,
    mastery,
    weakPoints,
    pins,
    courses,
    courseRuns,
    refreshAll,
    resolvePin,
  } = useMuv();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const avgMastery =
    mastery.length > 0
      ? mastery.reduce((sum, m) => sum + m.score, 0) / mastery.length
      : 0;

  const activeCourses = courseRuns.filter((r) => r.status === "active");

  const handlePinResolve = async (pinId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await resolvePin(pinId);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop:
              Platform.OS === "web" ? 67 + 16 : insets.top + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 80 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          Welcome back
        </Text>
        <Text style={[styles.learnerName, { color: theme.text }]}>
          {learner?.displayName || "Learner"}
        </Text>

        <LinearGradient
          colors={isDark ? ["#0E3D44", "#0A2A3C"] : ["#0A7E8C", "#0B6B78"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {Math.round(avgMastery * 100)}%
              </Text>
              <Text style={styles.heroStatLabel}>Avg Mastery</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{mastery.length}</Text>
              <Text style={styles.heroStatLabel}>Concepts</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeCourses.length}</Text>
              <Text style={styles.heroStatLabel}>Active</Text>
            </View>
          </View>
        </LinearGradient>

        {weakPoints.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={18} color={theme.warning} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Weak Points
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.warningLight }]}>
                <Text style={[styles.badgeText, { color: theme.warning }]}>
                  {weakPoints.length}
                </Text>
              </View>
            </View>
            {weakPoints.slice(0, 3).map((wp) => (
              <View
                key={wp.id}
                style={[styles.weakPointCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.wpRow}>
                  <View
                    style={[
                      styles.severityDot,
                      {
                        backgroundColor:
                          wp.severity > 0.7
                            ? theme.danger
                            : wp.severity > 0.4
                              ? theme.warning
                              : theme.accent,
                      },
                    ]}
                  />
                  <View style={styles.wpInfo}>
                    <Text style={[styles.wpType, { color: theme.text }]}>
                      {wp.wpType.replace(/_/g, " ")}
                    </Text>
                    <Text style={[styles.wpSeverity, { color: theme.textSecondary }]}>
                      Severity: {Math.round(wp.severity * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {pins.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bookmark-outline" size={18} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Pinned for Later
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.badgeText, { color: theme.accent }]}>
                  {pins.length}
                </Text>
              </View>
            </View>
            {pins.slice(0, 5).map((pin) => (
              <View
                key={pin.id}
                style={[styles.pinCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[styles.pinContent, { color: theme.text }]} numberOfLines={2}>
                  {pin.content}
                </Text>
                <Pressable
                  onPress={() => handlePinResolve(pin.id)}
                  hitSlop={12}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={theme.success} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {courses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book-outline" size={18} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Recent Courses
              </Text>
            </View>
            {courses.slice(0, 4).map((course) => {
              const run = courseRuns.find((r) => r.blueprintId === course.id);
              return (
                <View
                  key={course.id}
                  style={[styles.courseCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={styles.courseInfo}>
                    <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={1}>
                      {course.title}
                    </Text>
                    <Text style={[styles.courseStatus, { color: theme.textSecondary }]}>
                      {run?.status === "active" ? "In Progress" : run?.status || "Created"}
                    </Text>
                  </View>
                  {run && (
                    <View style={styles.progressContainer}>
                      <View
                        style={[styles.progressBg, { backgroundColor: theme.surfaceSecondary }]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: theme.primary,
                              width: `${Math.round(run.progress * 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: theme.textMuted }]}>
                        {Math.round(run.progress * 100)}%
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {courses.length === 0 && pins.length === 0 && weakPoints.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Ready to learn
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Go to the Speak tab and say something like "teach me about machine learning" to get started.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20 },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 2,
  },
  learnerName: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  heroStat: { alignItems: "center" },
  heroStatValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  weakPointCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  wpRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  wpInfo: { flex: 1 },
  wpType: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textTransform: "capitalize" as const,
  },
  wpSeverity: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  pinCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  pinContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  courseCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  courseInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  courseStatus: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textTransform: "capitalize" as const,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    width: 30,
    textAlign: "right" as const,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
