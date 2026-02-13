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
import { tokenService, TokenBalance } from "../services/tokenService";
import { useAppMode } from "../context/AppModeContext";
import { demoPostStore, ImageType } from "../services/demoPostStore";
import { supabaseService } from "../services/supabaseService";
import { sendTipNotification } from "../services/notificationService";

// Bundled images
const POST_IMAGES = {
  good: require("../../assets/good.png"),
  bad: require("../../assets/bad.png"),
  general: require("../../assets/general.png"),
};

interface Post {
  id: string;
  latitude: number;
  longitude: number;
  image_type: ImageType;
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
  const { signAndSendTransaction } = useMobileWallet();
  const { mode } = useAppMode();
  const routeParams = route.params as any;
  const post: Post | undefined = routeParams?.post;

  const [tipAmount, setTipAmount] = useState("");
  const [isTipping, setIsTipping] = useState(false);
  const [skrBalance, setSkrBalance] = useState<TokenBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Handle missing post data - must be before any hooks that use post
  if (!post) {
    return (
      <View style={[styles.wrapper, styles.centered]}>
        <Text variant="bodyLarge" style={{ color: "#F8FAFC" }}>
          Post not found
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
          buttonColor="#EAB308"
        >
          Go Back
        </Button>
      </View>
    );
  }

  // Now TypeScript knows post is defined
  const currentPost = post;

  useEffect(() => {
    if (selectedAccount?.address && mode === "real") {
      loadSKRBalance();
    }
  }, [selectedAccount?.address, mode]);

  const loadSKRBalance = async () => {
    if (!selectedAccount?.publicKey) return;

    setIsLoadingBalance(true);
    try {
      const address = selectedAccount.publicKey.toBase58();
      const balance = await tokenService.getSKRBalance(address);
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

    if (mode === "real" && skrBalance && amount > skrBalance.uiAmount) {
      Alert.alert("Error", "Insufficient SKR balance");
      return;
    }

    setIsTipping(true);

    try {
      if (mode === "real") {
        console.log("[TIP] Starting real mode tip...");
        console.log("[TIP] From:", selectedAccount.publicKey.toBase58());
        console.log("[TIP] To:", currentPost.creator);
        console.log("[TIP] Amount:", amount);
        
        // Real mode: Build transaction first
        console.log("[TIP] Building transaction...");
        const transaction = await tokenService.buildTransferTransaction(
          selectedAccount,
          currentPost.creator,
          amount
        );
        console.log("[TIP] Transaction built successfully");

        // Use signAndSendTransaction from useMobileWallet (handles transact internally)
        console.log("[TIP] Opening wallet...");
        const signature = await signAndSendTransaction(transaction, 0);
        console.log("[TIP] Transaction signature:", signature);
        
        // Wait for confirmation
        console.log("[TIP] Confirming transaction...");
        await tokenService.confirmTransaction(signature);
        console.log("[TIP] Transaction confirmed");

        // Record tip in Supabase
        console.log("[TIP] Recording tip in Supabase...");
        await supabaseService.recordTip(
          currentPost.id,
          selectedAccount.publicKey.toBase58(),
          amount
        );
        console.log("[TIP] Tip recorded");

        Alert.alert(
          "Success",
          `You tipped ${amount} SKR to ${currentPost.creator.slice(0, 8)}...${currentPost.creator.slice(-4)}!`,
          [{ text: "OK" }]
        );
        
        // Send notification to post creator
        await sendTipNotification(currentPost.id);
        
        // Refresh balance
        await loadSKRBalance();
      } else {
        // Demo mode: just update tips in demo store (no transact needed)
        demoPostStore.updatePostTips(currentPost.id, amount);

        Alert.alert(
          "Success",
          `Demo: You tipped ${amount} SKR (no real tokens transferred)`,
          [{ text: "OK" }]
        );
        
        // Send notification in demo mode too (for testing)
        await sendTipNotification(currentPost.id);
      }

      setTipAmount("");
    } catch (error: any) {
      console.error("[TIP] Error caught:", error);
      console.error("[TIP] Error message:", error?.message);
      console.error("[TIP] Error stack:", error?.stack);
      Alert.alert(
        "Error", 
        `Failed to send tip: ${error?.message || "Unknown error"}\n\nCheck console for details.`
      );
    } finally {
      console.log("[TIP] Cleaning up...");
      setIsTipping(false);
    }
  };

  const isTipButtonDisabled = () => {
    if (!selectedAccount || isTipping) return true;
    const amount = parseInt(tipAmount);
    if (isNaN(amount) || amount <= 0) return true;
    if (mode === "real" && skrBalance && amount > skrBalance.uiAmount) return true;
    return false;
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image 
              source={POST_IMAGES[currentPost.image_type || 'general']} 
              style={styles.image} 
              resizeMode="contain"
            />
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#000" />
              </View>
              <View style={styles.headerText}>
                <Text variant="bodyLarge" style={styles.creator}>
                  {currentPost.creator.slice(0, 8)}...{currentPost.creator.slice(-4)}
                </Text>
                <Text variant="bodySmall" style={styles.date}>
                  {formatDate(currentPost.timestamp)}
                </Text>
              </View>
              <View style={styles.expiryBadge}>
                <Text variant="bodySmall" style={styles.expiryText}>
                  {formatTimeLeft(currentPost.expiry)}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <Text variant="bodyLarge" style={styles.memo}>
              {currentPost.memo}
            </Text>

            <View style={styles.locationContainer}>
              <Ionicons name="location" size={20} color="#EAB308" />
              <Text variant="bodySmall" style={styles.locationText}>
                {currentPost.latitude.toFixed(4)}, {currentPost.longitude.toFixed(4)}
                {currentPost.distance && ` • ${Math.round(currentPost.distance)}m away`}
              </Text>
            </View>

            {currentPost.tips > 0 && (
              <Card style={styles.tipsCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.tipsTitle}>
                    {currentPost.tips} SKR tipped
                  </Text>
                </Card.Content>
              </Card>
            )}

            {selectedAccount?.address !== currentPost.creator && (
              <View style={styles.tipSection}>
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
              </View>
            )}

            <View style={styles.infoBox}>
              <Text variant="bodySmall" style={styles.infoText}>
                {mode === "real"
                  ? `This post expires in ${formatTimeLeft(currentPost.expiry)} and will no longer be discoverable on the map.`
                  : `This post expires in ${formatTimeLeft(currentPost.expiry)}. Demo mode - stored locally only.`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: "#0F172A",
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
    borderRadius: 8,
  },
  balanceText: {
    color: "#94A3B8",
    marginLeft: 8,
  },
  tipInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  tipInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tipButton: {
    minWidth: 100,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoText: {
    color: "#94A3B8",
    lineHeight: 20,
  },
});
