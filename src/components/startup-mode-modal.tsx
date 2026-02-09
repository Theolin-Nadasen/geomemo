import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Text, Button, Card, Portal, MD3DarkTheme } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppMode } from "../context/AppModeContext";

interface StartupModeModalProps {
  visible: boolean;
  initialMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onDismiss?: () => void;
}

export function StartupModeModal({
  visible,
  initialMode,
  onSelectMode,
  onDismiss,
}: StartupModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<AppMode>(initialMode);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleModeSelect = (mode: AppMode) => {
    setSelectedMode(mode);
    if (mode === "real") {
      setShowConfirmation(true);
    }
  };

  const handleConfirmRealMode = () => {
    onSelectMode("real");
    setShowConfirmation(false);
  };

  const handleCancelRealMode = () => {
    setShowConfirmation(false);
    setSelectedMode("demo");
  };

  const handleDemoConfirm = () => {
    onSelectMode("demo");
  };

  if (showConfirmation) {
    return (
      <Portal>
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={handleCancelRealMode}
        >
          <View style={styles.overlay}>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={32} color="#F59E0B" />
                  <Text variant="headlineSmall" style={styles.warningTitle}>
                    Real Mode Selected
                  </Text>
                </View>

                <Text variant="bodyMedium" style={styles.warningText}>
                  You are about to use Mainnet mode with real transactions:
                </Text>

                <View style={styles.bulletPoints}>
                  <Text variant="bodyMedium" style={styles.bullet}>
                    • Photos will be permanently stored on Arweave
                  </Text>
                  <Text variant="bodyMedium" style={styles.bullet}>
                    • Tips use real SKR tokens
                  </Text>
                  <Text variant="bodyMedium" style={styles.bullet}>
                    • Small SOL fees apply for transactions
                  </Text>
                  <Text variant="bodyMedium" style={styles.bullet}>
                    • All transactions are permanent and irreversible
                  </Text>
                </View>

                <Text variant="bodySmall" style={styles.costNote}>
                  Estimated costs: ~0.0001 SOL per upload, ~0.000005 SOL per tip
                </Text>

                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={handleCancelRealMode}
                    textColor="#94A3B8"
                    style={{ flex: 1, marginRight: 8, borderColor: "#334155" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleConfirmRealMode}
                    buttonColor="#F59E0B"
                    textColor="#000"
                    style={{ flex: 1 }}
                  >
                    Confirm
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onDismiss}
      >
        <View style={styles.overlay}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.title}>
                Welcome to GeoMemo
              </Text>

              <Text variant="bodyMedium" style={styles.subtitle}>
                Select your preferred mode:
              </Text>

              <ScrollView style={styles.optionsContainer}>
                {/* Demo Mode Option */}
                <Card
                  style={[
                    styles.modeCard,
                    selectedMode === "demo" && styles.selectedCardDemo,
                  ]}
                  onPress={() => handleModeSelect("demo")}
                >
                  <Card.Content>
                    <View style={styles.modeHeader}>
                      <Ionicons
                        name="game-controller"
                        size={28}
                        color={selectedMode === "demo" ? "#EAB308" : "#94A3B8"}
                      />
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.modeTitle,
                          selectedMode === "demo" && { color: "#EAB308" },
                        ]}
                      >
                        Demo Mode
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Try the app without spending real money
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Posts are stored locally only
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Tips are simulated (no real tokens)
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Perfect for testing and development
                    </Text>
                  </Card.Content>
                </Card>

                {/* Real Mode Option */}
                <Card
                  style={[
                    styles.modeCard,
                    selectedMode === "real" && styles.selectedCardReal,
                  ]}
                  onPress={() => handleModeSelect("real")}
                >
                  <Card.Content>
                    <View style={styles.modeHeader}>
                      <Ionicons
                        name="logo-usd"
                        size={28}
                        color={selectedMode === "real" ? "#3B82F6" : "#94A3B8"}
                      />
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.modeTitle,
                          selectedMode === "real" && { color: "#3B82F6" },
                        ]}
                      >
                        Real Mode (Mainnet)
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Posts stored permanently on Arweave
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Real SKR token transfers for tips
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Posts visible to all users worldwide
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      • Small SOL fees for transactions
                    </Text>
                  </Card.Content>
                </Card>
              </ScrollView>

              <View style={styles.buttonContainer}>
                {selectedMode === "demo" ? (
                  <Button
                    mode="contained"
                    onPress={handleDemoConfirm}
                    style={styles.confirmButton}
                    buttonColor="#EAB308"
                    textColor="#000"
                  >
                    Start Demo Mode
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => handleModeSelect("real")}
                    style={styles.confirmButton}
                    buttonColor="#3B82F6"
                    textColor="#fff"
                  >
                    Continue to Real Mode
                  </Button>
                )}
              </View>

              <Text variant="bodySmall" style={styles.footerNote}>
                You can change modes later in Settings
              </Text>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    backgroundColor: "#1E293B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#94A3B8",
  },
  optionsContainer: {
    maxHeight: 400,
  },
  modeCard: {
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
    borderRadius: 16,
  },
  selectedCardDemo: {
    borderColor: "#EAB308",
    backgroundColor: "rgba(234, 179, 8, 0.05)",
  },
  selectedCardReal: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modeTitle: {
    marginLeft: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  modeDescription: {
    color: "#94A3B8",
    marginLeft: 36,
    marginBottom: 4,
    fontSize: 13,
  },
  buttonContainer: {
    marginTop: 20,
  },
  confirmButton: {
    width: "100%",
    height: 52,
    justifyContent: "center",
    borderRadius: 12,
  },
  footerNote: {
    textAlign: "center",
    marginTop: 16,
    color: "#64748B",
    fontSize: 12,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  warningTitle: {
    marginLeft: 12,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  warningText: {
    marginBottom: 16,
    fontWeight: "bold",
    color: "#F8FAFC",
    textAlign: "center",
  },
  bulletPoints: {
    marginBottom: 20,
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  bullet: {
    marginBottom: 6,
    color: "#94A3B8",
    fontSize: 14,
  },
  costNote: {
    fontStyle: "italic",
    color: "#64748B",
    marginBottom: 24,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    borderRadius: 10,
  },
});
