import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "celebrate"
  | "pin_ack";

export interface AssistantContextValue {
  state: AssistantState;
  isExpanded: boolean;
  lastMessage: string;
  setState: (state: AssistantState) => void;
  setExpanded: (expanded: boolean) => void;
  setLastMessage: (message: string) => void;
  triggerCelebrate: () => void;
  triggerPinAck: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AssistantState>("idle");
  const [isExpanded, setExpanded] = useState(false);
  const [lastMessage, setLastMessage] = useState("");

  const setState = useCallback((s: AssistantState) => {
    setStateRaw(s);
  }, []);

  const triggerCelebrate = useCallback(() => {
    setStateRaw("celebrate");
    setTimeout(() => setStateRaw("idle"), 2500);
  }, []);

  const triggerPinAck = useCallback(() => {
    setStateRaw("pin_ack");
    setTimeout(() => setStateRaw("idle"), 1500);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        state,
        isExpanded,
        lastMessage,
        setState,
        setExpanded,
        setLastMessage,
        triggerCelebrate,
        triggerPinAck,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
