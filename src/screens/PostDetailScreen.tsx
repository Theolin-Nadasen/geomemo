import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Text, Button, Card, Divider, MD3DarkTheme } from "react-native-paper";
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
        const auth = await authorizeSession(wallet);
        if (!auth) {
          throw new Error("Not authorized");
        }

        await irysService.initialize(auth, mode);

        if (mode === "real") {
          const signTx = async (tx: Transaction): Promise<string> => {
            return await signAndSendTransaction(tx, 0);
          };

          await tokenService.transferSKR(
            selectedAccount,
            post.creator,
            amount,
            signTx
          );

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
          await irysService.recordTip(post.id, amount, selectedAccount.address, mode);

          Alert.alert(
            "Success",
            `Demo: You tipped ${amount} SKR (no real tokens transferred)`,
            [{ text: "OK" }]
          );
        }

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
            <Ionicons name="person" size={24} color="#000" />
          </View>
          <View style={styles.headerText}>
            <Text variant="bodyLarge" style={styles.creator}>
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
          <Ionicons name="location" size={20} color="#EAB308" />
          <Text variant="bodySmall" style={styles.locationText}>
            {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
            {post.distance && ` • ${Math.round(post.distance)}m away`}
          </Text>
        </View>

        {post.tips > 0 && (
          <Card style={styles.tipsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.tipsTitle}>
                🎉 {post.tips} SKR tipped
              </Text>
            </Card.Content>
          </Card>
        )}

        {selectedAccount?.address !== post.creator && (
          <View style={[styles.tipSection, !selectedAccount && { opacity: 0.6 }]}>
            <Text variant="titleLarge" style={styles.tipTitle}>
              Support this Creator
            </Text>
            <Text variant="bodyMedium" style={styles.tipDescription}>
              {mode === "demo"
                ? "Demo mode - tips are simulated (no real tokens)"
                : "Send real SKR tokens to show appreciation"}
            </Text>

            {mode === "real" && selectedAccount && (
              <View style={styles.balanceContainer}>
                <Ionicons name="wallet" size={18} color="#94A3B8" />
                <Text variant="bodyMedium" style={styles.balanceText}>
                  {isLoadingBalance
                    ? "Loading balance..."
                    : `Balance: ${skrBalance?.uiAmount.toFixed(2) ?? "0.00"} SKR`}
                </Text>
              </View>
            )}

            <View style={styles.tipInputContainer}>
              <TextInput
                style={[
                  styles.tipInput,
                  !selectedAccount && { backgroundColor: "#1e293b", opacity: 0.5 },
                ]}
                placeholder={
                  selectedAccount ? "Amount (SKR)" : "Connect wallet to tip"
                }
                placeholderTextColor="#94A3B8"
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
                buttonColor="#EAB308"
                textColor="#000"
              >
                {isTipping ? "Sending..." : "Tip"}
              </Button>
            </View>

            {mode === "real" &&
              selectedAccount &&
              skrBalance &&
              skrBalance.uiAmount === 0 && (
                <Text variant="bodySmall" style={styles.insufficientBalance}>
                  ⚠️ Insufficient balance for tipping
                </Text>
              )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text variant="bodySmall" style={styles.infoText}>
            ℹ️ {mode === "real"
              ? `This post expires in ${formatTimeLeft(post.expiry)} and will no longer be discoverable on the map. The on-chain proof is permanent.`
              : `This post expires in ${formatTimeLeft(post.expiry)}. Demo mode - stored locally only.`}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1E293B",
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    marginRight: 12,
    backgroundColor: "#EAB308",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#334155",
  },
  headerText: {
    flex: 1,
  },
  creator: {
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  date: {
    color: "#94A3B8",
    marginTop: 2,
  },
  expiryBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  expiryText: {
    color: "#EF4444",
    fontWeight: "bold",
  },
  divider: {
    marginBottom: 20,
    backgroundColor: "#334155",
  },
  memo: {
    marginBottom: 24,
    lineHeight: 28,
    color: "#F8FAFC",
    fontSize: 18,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  locationText: {
    color: "#94A3B8",
    marginLeft: 8,
    fontWeight: "500",
  },
  tipsCard: {
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
  },
  tipsTitle: {
    color: "#EAB308",
    textAlign: "center",
    fontWeight: "bold",
  },
  tipSection: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  tipTitle: {
    marginBottom: 6,
    color: "#F8FAFC",
    fontWeight: "bold",
  },
  tipDescription: {
    color: "#94A3B8",
    marginBottom: 16,
    lineHeight: 20,
  },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  balanceText: {
    marginLeft: 10,
    color: "#3B82F6",
    fontWeight: "600",
  },
  tipInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    fontSize: 16,
    color: "#F8FAFC",
  },
  tipButton: {
    minWidth: 110,
    height: 52,
    justifyContent: "center",
    borderRadius: 12,
  },
  insufficientBalance: {
    color: "#EF4444",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoText: {
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});
