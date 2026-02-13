// Polyfills
import "./src/polyfills";

import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainerRef,
} from "@react-navigation/native";
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from "react-native-paper";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { AppModeProvider, useAppMode } from "./src/context/AppModeContext";
import { StartupModeModal } from "./src/components/startup-mode-modal";
import { 
  initializeNotifications,
  setupNotificationResponseListener 
} from "./src/services/notificationService";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Navigation ref for handling notification taps
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

function AppContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showModeModal, setShowModeModal] = useState(true);
  const { mode, setMode, isLoading, hasSelectedMode } = useAppMode();
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
        });
        
        // Initialize notifications (non-blocking)
        await initializeNotifications();
      } catch (e) {
        console.warn("Error during app preparation:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Hide modal if user has already selected real mode previously
  useEffect(() => {
    if (!isLoading && hasSelectedMode && mode === "real") {
      setShowModeModal(false);
    }
  }, [isLoading, hasSelectedMode, mode]);
  
  // Set up notification response listener
  useEffect(() => {
    const cleanup = setupNotificationResponseListener(navigationRef);
    return cleanup;
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && !isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, isLoading]);

  const handleModeSelect = async (selectedMode: "demo" | "real") => {
    await setMode(selectedMode);
    // Only hide modal if real mode selected, keep showing for demo mode
    if (selectedMode === "real") {
      setShowModeModal(false);
    }
  };

  if (!appIsReady || isLoading) {
    return null;
  }

  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

  const CombinedDefaultTheme = {
    ...MD3LightTheme,
    ...LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      ...LightTheme.colors,
    },
  };
  const CombinedDarkTheme = {
    ...MD3DarkTheme,
    ...DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      ...DarkTheme.colors,
      primary: "#EAB308", // Gold
      onPrimary: "#000000",
      secondary: "#3B82F6", // Blue
      onSecondary: "#FFFFFF",
      background: "#0F172A", // Midnight Slate
      surface: "#1E293B", // Dark Navy Surface
      onSurface: "#F8FAFC", // Off-White Text
      onSurfaceVariant: "#94A3B8", // Slate Gray
      outline: "#334155",
      elevation: {
        level1: "#1E293B",
        level2: "#334155",
        level3: "#475569",
      },
      error: "#EF4444",
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <SafeAreaView
            onLayout={onLayoutRootView}
            style={[
              styles.shell,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? MD3DarkTheme.colors.background
                    : MD3LightTheme.colors.background,
              },
            ]}
          >
            <PaperProvider
              theme={
                colorScheme === "dark"
                  ? CombinedDarkTheme
                  : CombinedDefaultTheme
              }
            >
              <AppNavigator ref={navigationRef} />

              {/* Mode Selection Modal - Shows on startup */}
              <StartupModeModal
                visible={showModeModal}
                initialMode={mode}
                onSelectMode={handleModeSelect}
              />
            </PaperProvider>
          </SafeAreaView>
        </ConnectionProvider>
      </ClusterProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <AppModeProvider>
      <AppContent />
    </AppModeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
