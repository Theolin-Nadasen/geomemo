import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Text, Button, Card, Divider } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { irysService } from "../services/irysService";
import { tokenService, TokenBalance } from "../services/tokenService";
import { useAppMode } from "../context/AppModeContext";

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
  const { transact, signAndSendTransaction } = useMobileWallet();
  const { mode } = useAppMode();
  const { post }: { post: Post } = route.params as any;

  const [tipAmount, setTipAmount] = useState("");
  const [isTipping, setIsTipping] = useState(false);
  const [skrBalance, setSkrBalance] = useState<TokenBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  useEffect(() => {
    if (selectedAccount?.address && mode === "real") {
      loadSKRBalance();
    }
  }, [selectedAccount?.address, mode]);

  const loadSKRBalance = async () => {
    if (!selectedAccount?.address) return;
    
    setIsLoadingBalance(true);
    try {
      const balance = await tokenService.getSKRBalance(selectedAccount.address);
      setSkrBalance(balance);
    } catch (error) {
      console.error("Failed to load SKR balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

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

    // Check balance in real mode
    if (mode === "real" && skrBalance && skrBalance.uiAmount < amount) {
      Alert.alert(
        "Insufficient Balance",
        `You only have ${skrBalance.uiAmount.toFixed(2)} SKR. Please enter a smaller amount.`
      );
      return;
    }

    setIsTipping(true);

    try {
      await transact(async (wallet) => {
        // Get authorization for transaction
        const auth = await authorizeSession(wallet);
        if (!auth) {
          throw new Error("Not authorized");
        }

        // Initialize Irys
        await irysService.initialize(auth, mode);

        if (mode === "real") {
          // Real token transfer
          const signTx = async (tx: Transaction): Promise<string> => {
            return await signAndSendTransaction(tx, 0);
          };

          await tokenService.transferSKR(
            selectedAccount,
            post.creator,
            amount,
            signTx
          );

          // Record tip on Irys for proof
          await irysService.recordTip(
            post.id,
            amount,
            selectedAccount.address,
            mode,
            async (tx) => {
              const signatures = await wallet.signAndSendTransactions({
                transactions: [tx],
              });
              return signatures[0];
            }
          );

          Alert.alert(
            "Success",
            `You tipped ${amount} SKR to ${post.creator.slice(0, 8)}...${post.creator.slice(-4)}!`,
            [{ text: "OK" }]
          );
        } else {
          // Demo mode - just record mock tip
          await irysService.recordTip(post.id, amount, selectedAccount.address, mode);

          Alert.alert(
            "Success",
            `Demo: You tipped ${amount} SKR (no real tokens transferred)`,
            [{ text: "OK" }]
          );
        }

        // Refresh balance in real mode
        if (mode === "real") {
          await loadSKRBalance();
        }

        setTipAmount("");
      });
    } catch (error) {
      console.error("Failed to tip:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send tip. Please try again."
      );
    } finally {
      setIsTipping(false);
    }
  };

  const isTipButtonDisabled = () => {
    if (isTipping) return true;
    if (!selectedAccount) return true;
    if (!tipAmount) return true;
    
    const amount = parseInt(tipAmount);
    if (isNaN(amount) || amount <= 0) return true;
    
    // In real mode, disable if insufficient balance
    if (mode === "real" && skrBalance && skrBalance.uiAmount < amount) {
      return true;
    }
    
    return false;
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: post.photoUrl }} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
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
          <Ionicons name="location" size={20} color="#666" />
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

        {selectedAccount?.address !== post.creator && (
          <View style={[styles.tipSection, !selectedAccount && { opacity: 0.6 }]}>
            <Text variant="titleMedium" style={styles.tipTitle}>
              Tip Creator
            </Text>
            <Text variant="bodySmall" style={styles.tipDescription}>
              {mode === "demo"
                ? "Demo mode - tips are simulated (no real tokens)"
                : "Send real SKR tokens to show appreciation"}
            </Text>

            {/* SKR Balance Display (Real Mode Only) */}
            {mode === "real" && selectedAccount && (
              <View style={styles.balanceContainer}>
                <Ionicons name="wallet" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.balanceText}>
                  {isLoadingBalance
                    ? "Loading balance..."
                    : `Your balance: ${skrBalance?.uiAmount.toFixed(2) ?? "0.00"} SKR`}
                </Text>
              </View>
            )}

            <View style={styles.tipInputContainer}>
              <TextInput
                style={[
                  styles.tipInput,
                  !selectedAccount && { backgroundColor: "#f0f0f0" },
                ]}
                placeholder={
                  selectedAccount ? "Amount (SKR)" : "Sign in to tip"
                }
                keyboardType="number-pad"
                value={tipAmount}
                onChangeText={setTipAmount}
                editable={!!selectedAccount}
              />
              <Button
                mode="contained"
                onPress={
                  selectedAccount
                    ? handleTip
                    : () =>
                        Alert.alert(
                          "Sign In Required",
                          "Please connect your wallet to tip."
                        )
                }
                loading={isTipping}
                disabled={isTipButtonDisabled()}
                style={styles.tipButton}
              >
                {isTipping ? "Sending..." : "Tip"}
              </Button>
            </View>

            {/* Insufficient Balance Warning */}
            {mode === "real" &&
              selectedAccount &&
              skrBalance &&
              skrBalance.uiAmount === 0 && (
                <Text variant="bodySmall" style={styles.insufficientBalance}>
                  Insufficient SKR balance. You need SKR tokens to tip.
                </Text>
              )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text variant="bodySmall" style={styles.infoText}>
            {mode === "real"
              ? `This post expires in ${formatTimeLeft(post.expiry)} and will no longer be discoverable. The on-chain proof remains permanent on Arweave.`
              : `This post expires in ${formatTimeLeft(post.expiry)}. Demo mode - posts are stored locally only.`}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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
  locationText: {
    color: "#666",
    marginLeft: 4,
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
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  balanceText: {
    marginLeft: 8,
    color: "#666",
    fontWeight: "500",
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
  insufficientBalance: {
    color: "#d32f2f",
    marginTop: 8,
    textAlign: "center",
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
