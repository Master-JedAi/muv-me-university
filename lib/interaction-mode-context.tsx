import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type InteractionMode =
  | "voice_only"
  | "voice_text"
  | "click_only"
  | "any";

interface InteractionModeContextValue {
  mode: InteractionMode | null;
  hasChosenMode: boolean;
  isLoading: boolean;
  setMode: (mode: InteractionMode) => Promise<void>;
  resetMode: () => Promise<void>;
  keyboardEnabled: boolean;
  setKeyboardEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = "@muv_interaction_mode";
const InteractionModeContext =
  createContext<InteractionModeContextValue | null>(null);

export function InteractionModeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<InteractionMode | null>(null);
  const [hasChosenMode, setHasChosenMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setModeState(stored as InteractionMode);
          setHasChosenMode(true);
        }
      } catch (err) {
        console.error("Failed to load interaction mode:", err);
      }
      setIsLoading(false);
    })();
  }, []);

  const setMode = async (newMode: InteractionMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
      setModeState(newMode);
      setHasChosenMode(true);
    } catch (err) {
      console.error("Failed to save interaction mode:", err);
    }
  };

  const resetMode = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setModeState(null);
      setHasChosenMode(false);
    } catch (err) {
      console.error("Failed to reset interaction mode:", err);
    }
  };

  const value = useMemo(
    () => ({
      mode,
      hasChosenMode,
      isLoading,
      setMode,
      resetMode,
      keyboardEnabled,
      setKeyboardEnabled,
    }),
    [mode, hasChosenMode, isLoading, keyboardEnabled],
  );

  return (
    <InteractionModeContext.Provider value={value}>
      {children}
    </InteractionModeContext.Provider>
  );
}

export function useInteractionMode() {
  const ctx = useContext(InteractionModeContext);
  if (!ctx)
    throw new Error(
      "useInteractionMode must be used within InteractionModeProvider",
    );
  return ctx;
}
