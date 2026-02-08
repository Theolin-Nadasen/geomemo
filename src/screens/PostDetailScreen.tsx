import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Text, Button, Card, Avatar, Divider } from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { irysService } from "../services/irysService";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
} from "@solana/spl-token";

const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

interface Post {
  id: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  memo: string;
  creator: string;
  timestamp: number;
  expiry: number;
  tips: number;
  distance?: number;
}

export function PostDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedAccount, authorizeSession } = useAuthorization();
  const { post }: { post: Post } = route.params as any;

  const [tipAmount, setTipAmount] = useState("");
  const [isTipping, setIsTipping] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeLeft = (expiry: number) => {
    const now = Date.now();
    const diff = expiry - now;
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const handleTip = async () => {
    if (!selectedAccount) {
      Alert.alert("Error", "Please connect your wallet");
      return;
    }

    const amount = parseInt(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (post.creator === selectedAccount.address) {
      Alert.alert("Error", "You cannot tip your own post");
      return;
    }

    setIsTipping(true);

    try {
      // Get authorization for transaction
      const auth = await authorizeSession();
      if (!auth) {
        throw new Error("Not authorized");
      }

      // Initialize Irys
      await irysService.initialize(auth);

      // Record tip on Irys
      await irysService.recordTip(post.id, amount, selectedAccount.address);

      // Note: In a real implementation, we would also transfer SKR tokens
      // using the Mobile Wallet Adapter or a connected wallet
      
      Alert.alert(
        "Success",
        `You tipped ${amount} SKR!`,
        [{ text: "OK" }]
      );
      setTipAmount("");
    } catch (error) {
      console.error("Failed to tip:", error);
      Alert.alert("Error", "Failed to send tip. Please try again.");
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: post.photoUrl }} style={styles.image} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Avatar.Icon size={40} icon="account" style={styles.avatar} />
          <View style={styles.headerText}>
            <Text variant="bodyMedium" style={styles.creator}>
              {post.creator.slice(0, 8)}...{post.creator.slice(-4)}
            </Text>
            <Text variant="bodySmall" style={styles.date}>
              {formatDate(post.timestamp)}
            </Text>
          </View>
          <View style={styles.expiryBadge}>
            <Text variant="bodySmall" style={styles.expiryText}>
              {formatTimeLeft(post.expiry)}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Text variant="bodyLarge" style={styles.memo}>
          {post.memo}
        </Text>

        <View style={styles.locationContainer}>
          <Avatar.Icon size={24} icon="map-marker" style={styles.locationIcon} />
          <Text variant="bodySmall" style={styles.locationText}>
            {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
            {post.distance && ` • ${Math.round(post.distance)}m away`}
          </Text>
        </View>

        {post.tips > 0 && (
          <Card style={styles.tipsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.tipsTitle}>
                {post.tips} SKR received in tips
              </Text>
            </Card.Content>
          </Card>
        )}

        {selectedAccount && selectedAccount.address !== post.creator && (
          <View style={styles.tipSection}>
            <Text variant="titleMedium" style={styles.tipTitle}>
              Tip Creator
            </Text>
            <Text variant="bodySmall" style={styles.tipDescription}>
              Show appreciation with SKR tokens
            </Text>
            
            <View style={styles.tipInputContainer}>
              <TextInput
                style={styles.tipInput}
                placeholder="Amount (SKR)"
                keyboardType="number-pad"
                value={tipAmount}
                onChangeText={setTipAmount}
              />
              <Button
                mode="contained"
                onPress={handleTip}
                loading={isTipping}
                disabled={isTipping || !tipAmount}
                style={styles.tipButton}
              >
                Tip
              </Button>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text variant="bodySmall" style={styles.infoText}>
            This post expires in {formatTimeLeft(post.expiry)} and will no longer be discoverable. The on-chain proof remains permanent.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    marginRight: 12,
    backgroundColor: "#2196F3",
  },
  headerText: {
    flex: 1,
  },
  creator: {
    fontWeight: "bold",
  },
  date: {
    color: "#666",
  },
  expiryBadge: {
    backgroundColor: "#ffebee",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  expiryText: {
    color: "#c62828",
    fontWeight: "bold",
  },
  divider: {
    marginBottom: 16,
  },
  memo: {
    marginBottom: 16,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationIcon: {
    backgroundColor: "transparent",
    marginRight: 4,
  },
  locationText: {
    color: "#666",
  },
  tipsCard: {
    backgroundColor: "#e3f2fd",
    marginBottom: 16,
  },
  tipsTitle: {
    color: "#1976d2",
    textAlign: "center",
  },
  tipSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  tipTitle: {
    marginBottom: 4,
  },
  tipDescription: {
    color: "#666",
    marginBottom: 12,
  },
  tipInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    fontSize: 16,
  },
  tipButton: {
    minWidth: 100,
  },
  infoBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  infoText: {
    color: "#666",
    textAlign: "center",
  },
});
