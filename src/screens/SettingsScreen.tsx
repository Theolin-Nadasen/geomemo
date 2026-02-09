import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, Card, Button, Divider, Portal, Modal } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import ClusterPickerFeature from "../components/cluster/cluster-picker-feature";
import { useAppMode, AppMode } from "../context/AppModeContext";

export function SettingsScreen() {
  const { mode, setMode } = useAppMode();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);

  const handleModeChange = async (newMode: AppMode) => {
    if (newMode === mode) return;

    if (newMode === "real") {
      // Show confirmation for real mode
      setPendingMode(newMode);
      setShowConfirmation(true);
    } else {
      // Switch to demo mode immediately
      await setMode(newMode);
    }
  };

  const confirmRealMode = async () => {
    if (pendingMode) {
      await setMode(pendingMode);
      setPendingMode(null);
      setShowConfirmation(false);
    }
  };

  const cancelRealMode = () => {
    setPendingMode(null);
    setShowConfirmation(false);
  };

  return (
    <View style={styles.screenContainer}>
      <Text variant="headlineMedium" style={styles.title}>
        Settings
      </Text>

      {/* Mode Selection Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            App Mode
          </Text>
          <Text variant="bodySmall" style={styles.sectionDescription}>
            Choose between demo and real (mainnet) mode
          </Text>

          <View style={styles.modeButtons}>
            <Button
              mode={mode === "demo" ? "contained" : "outlined"}
              onPress={() => handleModeChange("demo")}
              style={[styles.modeButton, mode === "demo" && styles.activeDemoButton]}
              buttonColor={mode === "demo" ? "#4CAF50" : undefined}
            >
              Demo Mode
            </Button>
            <Button
              mode={mode === "real" ? "contained" : "outlined"}
              onPress={() => handleModeChange("real")}
              style={[styles.modeButton, mode === "real" && styles.activeRealButton]}
              buttonColor={mode === "real" ? "#2196F3" : undefined}
            >
              Real Mode
            </Button>
          </View>

          <View style={styles.modeInfo}>
            {mode === "demo" ? (
              <>
                <View style={styles.modeInfoRow}>
                  <Ionicons name="game-controller" size={20} color="#4CAF50" />
                  <Text variant="bodySmall" style={styles.modeInfoText}>
                    Demo Mode - No real transactions
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.modeDetails}>
                  • Posts stored locally only{"\n"}
                  • Tips are simulated{"\n"}
                  • No SOL or SKR tokens used
                </Text>
              </>
            ) : (
              <>
                <View style={styles.modeInfoRow}>
                  <Ionicons name="logo-usd" size={20} color="#2196F3" />
                  <Text variant="bodySmall" style={styles.modeInfoText}>
                    Real Mode - Mainnet transactions
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.modeDetails}>
                  • Posts stored permanently on Arweave{"\n"}
                  • Real SKR token transfers{"\n"}
                  • Small SOL fees apply
                </Text>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Cluster Picker */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Network
      </Text>
      <ClusterPickerFeature />

      {/* Real Mode Confirmation Dialog */}
      <Portal>
        <Modal
          visible={showConfirmation}
          transparent
          animationType="fade"
          onRequestClose={cancelRealMode}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Card.Content>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={32} color="#f57c00" />
                  <Text variant="titleLarge" style={styles.warningTitle}>
                    Switch to Real Mode?
                  </Text>
                </View>

                <Text variant="bodyMedium" style={styles.warningText}>
                  You are about to switch to Mainnet mode with real transactions:
                </Text>

                <View style={styles.bulletPoints}>
                  <Text variant="bodySmall" style={styles.bullet}>
                    • Photos will be permanently stored on Arweave
                  </Text>
                  <Text variant="bodySmall" style={styles.bullet}>
                    • Tips use real SKR tokens
                  </Text>
                  <Text variant="bodySmall" style={styles.bullet}>
                    • Small SOL fees apply for transactions
                  </Text>
                  <Text variant="bodySmall" style={styles.bullet}>
                    • All transactions are permanent and irreversible
                  </Text>
                </View>

                <Text variant="bodySmall" style={styles.costNote}>
                  Estimated costs: ~0.0001 SOL per upload, ~0.000005 SOL per tip
                </Text>

                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={cancelRealMode}
                    style={styles.button}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={confirmRealMode}
                    style={styles.button}
                    buttonColor="#2196F3"
                  >
                    I Understand
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    color: "#666",
    marginBottom: 16,
  },
  modeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  activeDemoButton: {
    backgroundColor: "#4CAF50",
  },
  activeRealButton: {
    backgroundColor: "#2196F3",
  },
  modeInfo: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
  },
  modeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modeInfoText: {
    marginLeft: 8,
    fontWeight: "600",
  },
  modeDetails: {
    color: "#666",
    marginLeft: 28,
  },
  divider: {
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  warningTitle: {
    marginLeft: 12,
    fontWeight: "bold",
    color: "#f57c00",
  },
  warningText: {
    marginBottom: 12,
    fontWeight: "600",
  },
  bulletPoints: {
    marginBottom: 16,
  },
  bullet: {
    marginBottom: 4,
    color: "#333",
  },
  costNote: {
    fontStyle: "italic",
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});
