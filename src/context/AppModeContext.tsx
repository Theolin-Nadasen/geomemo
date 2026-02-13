import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppMode = "demo" | "real";

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => Promise<void>;
  isLoading: boolean;
  hasSelectedMode: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = "@geomemo:app_mode";

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("demo");
  const [isLoading, setIsLoading] = useState(true);
  const [hasSelectedMode, setHasSelectedMode] = useState(false);

  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);
      if (savedMode === "demo" || savedMode === "real") {
        setModeState(savedMode);
        setHasSelectedMode(true);
      }
    } catch (error) {
      console.error("Failed to load app mode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = async (newMode: AppMode) => {
    try {
      await AsyncStorage.setItem(MODE_STORAGE_KEY, newMode);
      setModeState(newMode);
      setHasSelectedMode(true);
    } catch (error) {
      console.error("Failed to save app mode:", error);
    }
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, isLoading, hasSelectedMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}
