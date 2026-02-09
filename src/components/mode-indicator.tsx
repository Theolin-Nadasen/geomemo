import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppMode } from "../context/AppModeContext";

export function ModeIndicator() {
  const { mode } = useAppMode();

  return (
    <View
      style={[
        styles.container,
        mode === "demo" ? styles.demoContainer : styles.realContainer,
      ]}
    >
      <Text
        style={[styles.text, mode === "demo" ? styles.demoText : styles.realText]}
      >
        {mode === "demo" ? "DEMO MODE" : "MAINNET"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  demoContainer: {
    backgroundColor: "#EAB308",
  },
  realContainer: {
    backgroundColor: "#3B82F6",
  },
  text: {
    fontWeight: "bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  demoText: {
    color: "#000",
  },
  realText: {
    color: "#fff",
  },
});
