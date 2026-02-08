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
import { Text, Button, Card } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import { useNavigation } from "@react-navigation/native";

interface UserPost {
  id: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  memo: string;
  creator: string;
  timestamp: number;
  expiry: number;
  tips: number;
  status: "active" | "deleted";
}

// Mock data for development - will be replaced with Irys queries
const MOCK_USER_POSTS: UserPost[] = [
  {
    id: "1",
    latitude: 37.7749,
    longitude: -122.4194,
    photoUrl: "https://placehold.co/300x300",
    memo: "Beautiful view from here! This is a longer memo to test truncation...",
    creator: "7xKXtg2CW85d...",
    timestamp: Date.now() - 86400000,
    expiry: Date.now() + 6 * 86400000,
    tips: 150,
    status: "active",
  },
  {
    id: "2",
    latitude: 37.7755,
    longitude: -122.4185,
    photoUrl: "https://placehold.co/300x300",
    memo: "Hidden gem discovered",
    creator: "7xKXtg2CW85d...",
    timestamp: Date.now() - 172800000,
    expiry: Date.now() + 5 * 86400000,
    tips: 75,
    status: "active",
  },
];

export function ProfileScreen() {
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useMobileWallet();
  const navigation = useNavigation();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedAccount) {
      loadUserPosts();
    }
  }, [selectedAccount]);

  const loadUserPosts = async () => {
    // TODO: Query Irys for posts where creator == selectedAccount.address
    // Filter out deleted posts
    const activePosts = MOCK_USER_POSTS.filter(
      (post) => post.status === "active"
    );
    setPosts(activePosts);
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
      "This will hide your post from the app, but it will remain permanently stored on-chain. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // TODO: Update post status to "deleted" on Irys
            // For now, just filter locally
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId ? { ...post, status: "deleted" } : post
              )
            );
            // Remove from display immediately
            setPosts((prev) => prev.filter((post) => post.id !== postId));
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

  const renderPostCard = ({ item }: { item: UserPost }) => (
    <Card style={styles.card}>
      <View style={styles.cardContent}>
        <Image source={{ uri: item.photoUrl }} style={styles.cardImage} />
        <View style={styles.cardInfo}>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.memo}>
            {item.memo}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {formatDate(item.timestamp)} • {formatTimeLeft(item.expiry)}
          </Text>
          <View style={styles.tipsContainer}>
            <Ionicons name="cash-outline" size={20} color="#2196F3" style={{marginRight: 4}} />
            <Text variant="bodyMedium" style={styles.tipsText}>
              {item.tips} SKR
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeletePost(item.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={24} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (!selectedAccount) {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Profile
        </Text>
        <Text variant="bodyLarge" style={styles.connectPrompt}>
          Connect your wallet to view your GeoMemos
        </Text>
        <SignInFeature />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Profile
        </Text>
        <Button mode="outlined" onPress={handleDisconnect} compact>
          Disconnect
        </Button>
      </View>

      <View style={styles.walletInfo}>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet-outline" size={28} color="#fff" />
        </View>
        <View style={styles.walletDetails}>
          <Text variant="bodyLarge" style={styles.address}>
            {selectedAccount.address.slice(0, 6)}...
            {selectedAccount.address.slice(-4)}
          </Text>
          <Text variant="bodySmall" style={styles.walletLabel}>
            Connected Wallet
          </Text>
        </View>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        My GeoMemos
      </Text>

      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No GeoMemos yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Create your first post from the map screen!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontWeight: "bold",
  },
  connectPrompt: {
    textAlign: "center",
    marginVertical: 32,
    color: "#666",
  },
  walletInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  walletIcon: {
    backgroundColor: "#2196F3",
    marginRight: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  walletDetails: {
    flex: 1,
  },
  address: {
    fontWeight: "bold",
  },
  walletLabel: {
    color: "#666",
    marginTop: 2,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: "bold",
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  memo: {
    marginBottom: 4,
  },
  meta: {
    color: "#666",
    marginBottom: 4,
  },
  tipsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipIcon: {
    marginRight: 4,
  },
  tipsText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  deleteButton: {
    margin: 0,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptySubtext: {
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
