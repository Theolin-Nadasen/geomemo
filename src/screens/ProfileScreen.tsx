import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
} from "react-native";
import { Text, Button, Card, MD3DarkTheme } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import { useNavigation } from "@react-navigation/native";
import { useAppMode } from "../context/AppModeContext";
import { supabaseService, Post } from "../services/supabaseService";
import { demoPostStore } from "../services/demoPostStore";

// Bundled images
const POST_IMAGES = {
  good: require("../../assets/good.png"),
  bad: require("../../assets/bad.png"),
  general: require("../../assets/general.png"),
};

export function ProfileScreen() {
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useMobileWallet();
  const { mode, setMode } = useAppMode();
  const navigation = useNavigation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedAccount) {
      loadUserPosts();
    }
  }, [selectedAccount, mode]);

  const loadUserPosts = async () => {
    if (!selectedAccount) return;

    if (mode === "demo") {
      // Demo mode: get posts from demo store
      const demoPosts = demoPostStore.getPosts().filter(
        post => post.creator === selectedAccount.publicKey.toBase58()
      );
      // Convert DemoPost to Post format
      const convertedPosts: Post[] = demoPosts.map(post => ({
        id: post.id,
        creator: post.creator,
        latitude: post.latitude,
        longitude: post.longitude,
        geohash: '',
        memo: post.memo,
        image_type: post.image_type,
        timestamp: post.timestamp,
        expiry: post.expiry,
        tips: post.tips,
      }));
      setPosts(convertedPosts);
    } else {
      // Real mode: get posts from Supabase
      const creatorAddress = selectedAccount.publicKey.toBase58();
      const realPosts = await supabaseService.getPostsByCreator(creatorAddress);
      setPosts(realPosts);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserPosts();
    setRefreshing(false);
  };

  const handleDisconnect = async () => {
    Alert.alert(
      "Disconnect Wallet",
      "Are you sure you want to disconnect your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnect();
              setPosts([]);
            } catch (error) {
              console.error("Failed to disconnect:", error);
            }
          },
        },
      ]
    );
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Delete GeoMemo",
      "This will hide your post from the app. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (mode === "demo") {
              // In demo mode, just remove from local state
              setPosts((prev) => prev.filter((post) => post.id !== postId));
            } else {
              // In real mode, we would need to update the post status in Supabase
              // For now, just remove from local state
              setPosts((prev) => prev.filter((post) => post.id !== postId));
            }
          },
        },
      ]
    );
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderPostCard = ({ item }: { item: Post }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate("PostDetail", { post: { ...item, distance: 0 } })}
    >
      <View style={styles.cardContent}>
        <Image source={POST_IMAGES[item.image_type]} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardInfo}>
          <Text variant="bodyLarge" numberOfLines={1} style={styles.memo}>
            {item.memo}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {formatDate(item.timestamp)} • {formatTimeLeft(item.expiry)}
          </Text>
          <View style={styles.tipsContainer}>
            <Ionicons name="cash-outline" size={18} color="#EAB308" style={{ marginRight: 6 }} />
            <Text variant="bodyMedium" style={styles.tipsText}>
              {item.tips} SKR
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeletePost(item.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (!selectedAccount) {
    return (
      <View style={[styles.container, styles.connectContainer]}>
        <Text variant="headlineMedium" style={[styles.title, { color: "#EAB308", marginBottom: 8 }]}>
          Profile
        </Text>
        <Text variant="bodyLarge" style={styles.connectPrompt}>
          Connect your wallet to view your GeoMemos and track your earnings.
        </Text>
        <SignInFeature />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: "#EAB308" }]}>
          Profile
        </Text>
        <Button
          mode="outlined"
          onPress={handleDisconnect}
          compact
          textColor="#EF4444"
          style={{ borderColor: "#EF4444" }}
        >
          Disconnect
        </Button>
      </View>

      <View style={styles.walletInfo}>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet-outline" size={28} color="#000" />
        </View>
        <View style={styles.walletDetails}>
          <Text variant="titleLarge" style={styles.address}>
            {selectedAccount.publicKey.toBase58().slice(0, 8)}...
            {selectedAccount.publicKey.toBase58().slice(-6)}
          </Text>
          <Text variant="bodySmall" style={styles.walletLabel}>
            Connected Solana Wallet
          </Text>
        </View>
      </View>

      <View style={styles.modeSection}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          APP MODE
        </Text>
        <View style={styles.modeToggle}>
          <Button
            mode={mode === "demo" ? "contained" : "outlined"}
            onPress={() => setMode("demo")}
            style={[styles.modeButton, mode === "demo" && { backgroundColor: "#EAB308" }]}
            textColor={mode === "demo" ? "#000" : "#EAB308"}
          >
            Demo
          </Button>
          <Button
            mode={mode === "real" ? "contained" : "outlined"}
            onPress={() => setMode("real")}
            style={[styles.modeButton, mode === "real" && { backgroundColor: "#3B82F6" }]}
            textColor={mode === "real" ? "#fff" : "#3B82F6"}
          >
            Real
          </Button>
        </View>
        <Text variant="bodySmall" style={styles.modeDescription}>
          {mode === "demo" 
            ? "Demo mode - posts stored locally, simulated tips" 
            : "Real mode - posts stored in Supabase, real SKR tips"}
        </Text>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        MY GEOMEMOS
      </Text>

      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EAB308"
            colors={["#EAB308"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium" style={{ color: "#F8FAFC" }}>No GeoMemos yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Start sharing moments! Create your first post from the map screen.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate("Map")}
              style={{ marginTop: 24 }}
              buttonColor="#EAB308"
              textColor="#000"
            >
              Back to Map
            </Button>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },
  connectContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  connectPrompt: {
    textAlign: "center",
    marginVertical: 24,
    color: "#94A3B8",
    lineHeight: 22,
  },
  walletInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#334155",
  },
  walletIcon: {
    backgroundColor: "#EAB308",
    marginRight: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#334155",
  },
  walletDetails: {
    flex: 1,
  },
  address: {
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  walletLabel: {
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.5,
    fontSize: 12,
  },
  modeSection: {
    marginBottom: 24,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modeButton: {
    flex: 1,
    borderRadius: 8,
  },
  modeDescription: {
    color: "#94A3B8",
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 16,
    backgroundColor: "#0F172A",
  },
  cardInfo: {
    flex: 1,
  },
  memo: {
    marginBottom: 4,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  meta: {
    color: "#94A3B8",
    marginBottom: 6,
    fontSize: 12,
  },
  tipsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipsText: {
    color: "#EAB308",
    fontWeight: "bold",
    fontSize: 15,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptySubtext: {
    color: "#94A3B8",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },
});
