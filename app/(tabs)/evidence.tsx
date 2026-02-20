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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMuv } from "@/lib/muv-context";
import { useThemeColors } from "@/constants/colors";

export default function EvidenceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const { evidence, refreshEvidence } = useMuv();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<(typeof evidence)[0] | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEvidence();
    setRefreshing(false);
  }, []);

  const artifactIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "quiz_attempt":
        return "help-circle-outline";
      case "game_run":
        return "game-controller-outline";
      case "evidence_pack":
        return "search-outline";
      case "checkpoint":
        return "flag-outline";
      case "portfolio_entry":
        return "briefcase-outline";
      default:
        return "document-outline";
    }
  };

  const artifactColor = (type: string) => {
    switch (type) {
      case "quiz_attempt":
        return theme.accent;
      case "game_run":
        return theme.success;
      case "evidence_pack":
        return "#8B5CF6";
      case "checkpoint":
        return theme.primary;
      case "portfolio_entry":
        return "#EC4899";
      default:
        return theme.textMuted;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Evidence</Text>
        <Text style={[styles.pageSub, { color: theme.textSecondary }]}>
          {evidence.length} verifiable artifact{evidence.length !== 1 ? "s" : ""}
        </Text>

        {evidence.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No evidence yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Complete quizzes, games, or other learning activities to generate evidence artifacts.
            </Text>
          </View>
        )}

        {evidence.map((artifact) => (
          <Pressable
            key={artifact.id}
            onPress={() => setSelectedArtifact(artifact)}
            style={({ pressed }) => [
              styles.artifactCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.artifactHeader}>
              <View
                style={[
                  styles.artifactIcon,
                  {
                    backgroundColor: artifactColor(artifact.artifactType) + "20",
                  },
                ]}
              >
                <Ionicons
                  name={artifactIcon(artifact.artifactType)}
                  size={20}
                  color={artifactColor(artifact.artifactType)}
                />
              </View>
              <View style={styles.artifactInfo}>
                <Text style={[styles.artifactType, { color: theme.text }]}>
                  {artifact.artifactType.replace(/_/g, " ")}
                </Text>
                <Text style={[styles.artifactTime, { color: theme.textMuted }]}>
                  {formatDate(artifact.createdAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.integrityBadge,
                  {
                    backgroundColor:
                      artifact.integrity === "prototype"
                        ? theme.warningLight
                        : theme.successLight,
                  },
                ]}
              >
                <Ionicons
                  name={
                    artifact.integrity === "prototype"
                      ? "construct-outline"
                      : "checkmark-circle-outline"
                  }
                  size={12}
                  color={
                    artifact.integrity === "prototype"
                      ? theme.warning
                      : theme.success
                  }
                />
                <Text
                  style={[
                    styles.integrityText,
                    {
                      color:
                        artifact.integrity === "prototype"
                          ? theme.warning
                          : theme.success,
                    },
                  ]}
                >
                  {artifact.integrity}
                </Text>
              </View>
            </View>

            {artifact.hash && (
              <View style={styles.hashRow}>
                <Ionicons name="finger-print-outline" size={13} color={theme.textMuted} />
                <Text style={[styles.hashText, { color: theme.textMuted }]}>
                  {artifact.hash}
                </Text>
              </View>
            )}

            {(artifact.tags as string[])?.length > 0 && (
              <View style={styles.tagsRow}>
                {(artifact.tags as string[]).map((tag, i) => (
                  <View
                    key={i}
                    style={[styles.tag, { backgroundColor: theme.surfaceSecondary }]}
                  >
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {artifact.metrics && Object.keys(artifact.metrics as Record<string, unknown>).length > 0 && (
              <View style={styles.metricsRow}>
                {Object.entries(artifact.metrics as Record<string, unknown>)
                  .slice(0, 3)
                  .map(([key, val]) => (
                    <View key={key} style={styles.metric}>
                      <Text style={[styles.metricValue, { color: theme.text }]}>
                        {typeof val === "number"
                          ? val < 1
                            ? `${Math.round(val * 100)}%`
                            : val
                          : String(val)}
                      </Text>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
                        {key.replace(/_/g, " ")}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <Modal
        visible={!!selectedArtifact}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedArtifact(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedArtifact(null)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle}>
              <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Artifact Detail
              </Text>
              <Pressable onPress={() => setSelectedArtifact(null)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            {selectedArtifact && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              >
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Type
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedArtifact.artifactType.replace(/_/g, " ")}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Session
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
                    {selectedArtifact.sessionId}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Hash
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedArtifact.hash || "N/A"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Integrity
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedArtifact.integrity}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Created
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {new Date(selectedArtifact.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={[styles.payloadTitle, { color: theme.textSecondary }]}
                >
                  Payload (Replayable Log)
                </Text>
                <View
                  style={[
                    styles.payloadBlock,
                    { backgroundColor: theme.surfaceSecondary },
                  ]}
                >
                  <Text
                    style={[styles.payloadText, { color: theme.text }]}
                    selectable
                  >
                    {JSON.stringify(selectedArtifact.payload, null, 2)}
                  </Text>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 2,
  },
  pageSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 20,
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
  artifactCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  artifactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  artifactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  artifactInfo: { flex: 1 },
  artifactType: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textTransform: "capitalize" as const,
  },
  artifactTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  integrityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  integrityText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    textTransform: "capitalize" as const,
  },
  hashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  hashText: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  metric: { alignItems: "center" },
  metricValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  metricLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2,
    textTransform: "capitalize" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHandle: {
    alignItems: "center",
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  modalScroll: { paddingHorizontal: 20 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  detailValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    maxWidth: "60%",
    textAlign: "right" as const,
  },
  payloadTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
  },
  payloadBlock: {
    borderRadius: 10,
    padding: 12,
  },
  payloadText: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 11,
    lineHeight: 16,
  },
});
