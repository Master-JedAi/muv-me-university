import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  useColorScheme,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMuv } from "@/lib/muv-context";
import { useThemeColors } from "@/constants/colors";

export default function LearnScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const { courses, courseRuns, mastery, refreshCourses, refreshMastery, orchestrate } =
    useMuv();

  const [refreshing, setRefreshing] = useState(false);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseTopic, setNewCourseTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshCourses(), refreshMastery()]);
    setRefreshing(false);
  }, []);

  const handleCreateCourse = async () => {
    if (!newCourseTopic.trim()) return;
    setCreating(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await orchestrate(`teach me about ${newCourseTopic}`);
      setNewCourseTopic("");
      setShowNewCourse(false);
    } catch (err) {
      console.error("Failed to create course:", err);
    }
    setCreating(false);
  };

  const getConceptMastery = (conceptIds: string[]) => {
    if (!conceptIds || conceptIds.length === 0) return 0;
    const relevant = mastery.filter((m) =>
      conceptIds.includes(m.conceptId),
    );
    if (relevant.length === 0) return 0;
    return relevant.reduce((sum, m) => sum + m.score, 0) / relevant.length;
  };

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: theme.text }]}>
              Learn
            </Text>
            <Text style={[styles.pageSub, { color: theme.textSecondary }]}>
              {courses.length} course{courses.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowNewCourse(true)}
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </Pressable>
        </View>

        {courses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No courses yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Create your first course or use voice to say "teach me about..." any topic.
            </Text>
          </View>
        )}

        {courses.map((course) => {
          const run = courseRuns.find((r) => r.blueprintId === course.id);
          const avg = getConceptMastery(course.conceptIds as string[]);

          return (
            <View
              key={course.id}
              style={[
                styles.courseCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.courseHeader}>
                <View
                  style={[
                    styles.courseIcon,
                    { backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Ionicons name="book" size={20} color={theme.primary} />
                </View>
                <View style={styles.courseInfo}>
                  <Text
                    style={[styles.courseTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {course.title}
                  </Text>
                  <Text
                    style={[styles.courseDesc, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {course.description || "Voice-created course"}
                  </Text>
                </View>
              </View>

              <View style={styles.courseStats}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {(course.conceptIds as string[])?.length || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Concepts
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {Math.round(avg * 100)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Mastery
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {run?.status === "active" ? "Active" : run?.status || "--"}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Status
                  </Text>
                </View>
              </View>

              {run && (
                <View style={styles.progressRow}>
                  <View
                    style={[
                      styles.progressBg,
                      { backgroundColor: theme.surfaceSecondary },
                    ]}
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
                </View>
              )}
            </View>
          );
        })}

        {mastery.length > 0 && (
          <View style={styles.masterySection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Concept Mastery
            </Text>
            {mastery.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.masteryRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.masteryInfo}>
                  <Text
                    style={[styles.masteryLabel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {m.conceptId.substring(0, 8)}...
                  </Text>
                  <Text
                    style={[styles.masteryScore, { color: theme.textSecondary }]}
                  >
                    Stability: {Math.round(m.stability * 100)}%
                  </Text>
                </View>
                <View style={styles.masteryBar}>
                  <View
                    style={[
                      styles.masteryBarBg,
                      { backgroundColor: theme.surfaceSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.masteryBarFill,
                        {
                          backgroundColor:
                            m.score > 0.7
                              ? theme.success
                              : m.score > 0.4
                                ? theme.accent
                                : theme.danger,
                          width: `${Math.round(m.score * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.masteryPercent, { color: theme.text }]}
                  >
                    {Math.round(m.score * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showNewCourse}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewCourse(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNewCourse(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle}>
              <View
                style={[styles.handle, { backgroundColor: theme.textMuted }]}
              />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              New Course
            </Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              What do you want to learn?
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.surfaceSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g., Machine Learning, Spanish, etc."
              placeholderTextColor={theme.textMuted}
              value={newCourseTopic}
              onChangeText={setNewCourseTopic}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateCourse}
            />
            <Pressable
              onPress={handleCreateCourse}
              disabled={!newCourseTopic.trim() || creating}
              style={({ pressed }) => [
                styles.createButton,
                {
                  backgroundColor:
                    newCourseTopic.trim() && !creating
                      ? theme.primary
                      : theme.surfaceSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.createButtonText,
                  {
                    color:
                      newCourseTopic.trim() && !creating
                        ? "#FFF"
                        : theme.textMuted,
                  },
                ]}
              >
                {creating ? "Creating..." : "Create Course"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  pageSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
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
  courseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: { flex: 1 },
  courseTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  courseDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  courseStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  stat: { alignItems: "center" },
  statValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  progressRow: { marginTop: 4 },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  masterySection: { marginTop: 20 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
  },
  masteryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  masteryInfo: { flex: 1 },
  masteryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  masteryScore: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  masteryBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 120,
  },
  masteryBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  masteryBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  masteryPercent: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    width: 32,
    textAlign: "right" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    alignItems: "center",
    marginBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  createButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
