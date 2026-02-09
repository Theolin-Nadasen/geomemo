import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button, Card } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";

interface AlphaErrorProps {
  message: string;
  onRetry?: () => void;
  onSwitchToDemo?: () => void;
}

export function AlphaError({ message, onRetry, onSwitchToDemo }: AlphaErrorProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={48} color="#FF9800" />
        </View>
        
        <Text variant="titleLarge" style={styles.title}>
          Alpha Feature
        </Text>
        
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
        
        <Text variant="bodySmall" style={styles.subtitle}>
          GeoMemo Real Mode is currently in Alpha. Some features may not work perfectly yet. We appreciate your patience as we improve the experience.
        </Text>
        
        <View style={styles.buttonContainer}>
          {onRetry && (
            <Button
              mode="contained"
              onPress={onRetry}
              style={styles.button}
              buttonColor="#2196F3"
            >
              Retry
            </Button>
          )}
          
          {onSwitchToDemo && (
            <Button
              mode="outlined"
              onPress={onSwitchToDemo}
              style={styles.button}
            >
              Switch to Demo Mode
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: "#FFF3E0",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
    color: "#E65100",
  },
  message: {
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
    fontStyle: "italic",
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
});
