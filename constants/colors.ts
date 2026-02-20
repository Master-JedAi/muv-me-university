const Colors = {
  light: {
    text: "#1A1D23",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    surfaceSecondary: "#F0F2F5",
    primary: "#0A7E8C",
    primaryLight: "#E0F4F7",
    accent: "#F5A623",
    accentLight: "#FFF3E0",
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    danger: "#EF4444",
    dangerLight: "#FEE2E2",
    border: "#E5E7EB",
    tint: "#0A7E8C",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#0A7E8C",
    cardShadow: "rgba(0,0,0,0.06)",
  },
  dark: {
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textMuted: "#6B7280",
    background: "#0B1426",
    surface: "#1A2332",
    surfaceSecondary: "#243044",
    primary: "#14B8C8",
    primaryLight: "#0E2A3C",
    accent: "#F5A623",
    accentLight: "#3D2E10",
    success: "#34D399",
    successLight: "#064E3B",
    warning: "#FBBF24",
    warningLight: "#451A03",
    danger: "#F87171",
    dangerLight: "#450A0A",
    border: "#2D3748",
    tint: "#14B8C8",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#14B8C8",
    cardShadow: "rgba(0,0,0,0.3)",
  },
};

export default Colors;

export function useThemeColors(isDark: boolean) {
  return isDark ? Colors.dark : Colors.light;
}
