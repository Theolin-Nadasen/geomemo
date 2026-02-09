import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Text, Button, Card, Portal } from "react-native-paper";
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
                  <Ionicons name="warning" size={32} color="#f57c00" />
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

                <Text variant="bodyMedium" style={styles.costNote}>
                  Estimated costs: ~0.0001 SOL per upload, ~0.000005 SOL per tip
                </Text>

                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={handleCancelRealMode}
                    style={styles.button}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleConfirmRealMode}
                    style={styles.button}
                  >
                    I Understand
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
                    selectedMode === "demo" && styles.selectedCard,
                  ]}
                  onPress={() => handleModeSelect("demo")}
                >
                  <Card.Content>
                    <View style={styles.modeHeader}>
                      <Ionicons
                        name="game-controller"
                        size={28}
                        color={selectedMode === "demo" ? "#4CAF50" : "#666"}
                      />
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.modeTitle,
                          selectedMode === "demo" && styles.selectedText,
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
                    selectedMode === "real" && styles.selectedCard,
                  ]}
                  onPress={() => handleModeSelect("real")}
                >
                  <Card.Content>
                    <View style={styles.modeHeader}>
                      <Ionicons
                        name="logo-usd"
                        size={28}
                        color={selectedMode === "real" ? "#2196F3" : "#666"}
                      />
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.modeTitle,
                          selectedMode === "real" && styles.selectedText,
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
                    buttonColor="#4CAF50"
                  >
                    Start Demo Mode
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => handleModeSelect("real")}
                    style={styles.confirmButton}
                    buttonColor="#2196F3"
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 16,
    color: "#666",
  },
  optionsContainer: {
    maxHeight: 400,
  },
  modeCard: {
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: "#2196F3",
    backgroundColor: "#e3f2fd",
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modeTitle: {
    marginLeft: 12,
    fontWeight: "600",
  },
  selectedText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  modeDescription: {
    color: "#666",
    marginLeft: 40,
    marginBottom: 2,
  },
  buttonContainer: {
    marginTop: 16,
  },
  confirmButton: {
    width: "100%",
  },
  footerNote: {
    textAlign: "center",
    marginTop: 12,
    color: "#999",
  },
  // Confirmation screen styles
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
