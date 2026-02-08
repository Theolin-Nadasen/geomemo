import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Text, Card, Button } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { useAuthorization } from "../utils/useAuthorization";
import { useNavigation } from "@react-navigation/native";

interface GeoPost {
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

const MOCK_POSTS: GeoPost[] = [
  {
    id: "1",
    latitude: 37.7749,
    longitude: -122.4194,
    photoUrl: "https://placehold.co/300x300",
    memo: "Beautiful view from here!",
    creator: "7xKXtg2CW85d...",
    timestamp: Date.now() - 86400000,
    expiry: Date.now() + 6 * 86400000,
    tips: 150,
    distance: 50,
  },
  {
    id: "2",
    latitude: 37.7755,
    longitude: -122.4185,
    photoUrl: "https://placehold.co/300x300",
    memo: "Hidden gem discovered",
    creator: "ABC123...",
    timestamp: Date.now() - 172800000,
    expiry: Date.now() + 5 * 86400000,
    tips: 75,
    distance: 85,
  },
];

// Haversine distance in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function MapScreen() {
  const { selectedAccount } = useAuthorization();
  const navigation = useNavigation();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [posts, setPosts] = useState<GeoPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required to discover nearby posts.");
      return;
    }
    await getCurrentLocation();
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
      await discoverPosts(loc);
    } catch (error) {
      Alert.alert("Error", "Failed to get location");
    }
  };

  const discoverPosts = async (loc: Location.LocationObject) => {
    const now = Date.now();
    
    // Filter posts within 100m that haven't expired
    const nearbyPosts = MOCK_POSTS
      .map((post) => ({
        ...post,
        distance: haversine(
          loc.coords.latitude,
          loc.coords.longitude,
          post.latitude,
          post.longitude
        ),
      }))
      .filter((post) => post.distance <= 100 && post.expiry > now)
      .sort((a, b) => b.timestamp - a.timestamp);

    setPosts(nearbyPosts);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (location) {
      await discoverPosts(location);
    }
    setRefreshing(false);
  }, [location]);

  const formatDistance = (meters?: number) => {
    if (!meters) return "";
    return meters < 1000 ? `${Math.round(meters)}m away` : `${(meters / 1000).toFixed(1)}km away`;
  };

  const formatTimeLeft = (expiry: number) => {
    const hoursLeft = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60));
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `${daysLeft} days left`;
  };

  const renderPostCard = ({ item }: { item: GeoPost }) => (
    <Card style={styles.card} onPress={() => navigation.navigate("PostDetail", { post: item })}>
      <Card.Cover source={{ uri: item.photoUrl }} style={styles.cardImage} />
      <Card.Content>
        <Text variant="bodyMedium" numberOfLines={2}>
          {item.memo}
        </Text>
        <View style={styles.cardMeta}>
          <Text variant="bodySmall" style={styles.metaText}>
            {formatDistance(item.distance)}
          </Text>
          <Text variant="bodySmall" style={styles.metaText}>
            {formatTimeLeft(item.expiry)}
          </Text>
        </View>
        {item.tips > 0 && (
          <Text variant="bodySmall" style={styles.tipsText}>
            {item.tips} SKR tipped
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          GeoMemo
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle" size={32} color="#2196F3" />
          </TouchableOpacity>
          <View style={styles.toggleContainer}>
            <Button
              mode={viewMode === "map" ? "contained" : "outlined"}
              onPress={() => setViewMode("map")}
              style={styles.toggleButton}
            >
              Map
            </Button>
            <Button
              mode={viewMode === "list" ? "contained" : "outlined"}
              onPress={() => setViewMode("list")}
              style={styles.toggleButton}
            >
              List
            </Button>
          </View>
        </View>
      </View>

      {viewMode === "map" ? (
        <MapView
          style={styles.map}
          region={
            location
              ? {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }
              : {
                  latitude: 37.7749,
                  longitude: -122.4194,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
          }
        >
          {location && (
            <>
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="You are here"
                pinColor="blue"
              />
              <Circle
                center={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                radius={100}
                fillColor="rgba(0, 0, 255, 0.1)"
                strokeColor="rgba(0, 0, 255, 0.3)"
              />
            </>
          )}
          {posts.map((post) => (
            <Marker
              key={post.id}
              coordinate={{ latitude: post.latitude, longitude: post.longitude }}
              onPress={() => navigation.navigate("PostDetail", { post })}
            >
              <View style={[styles.markerContainer, { backgroundColor: '#FF5722' }]}>
                <Ionicons name="location" size={24} color="#fff" />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">No posts nearby</Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Walk around to discover GeoMemos within 100m
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <View style={styles.fab}>
          <Ionicons name="camera" size={24} color="#fff" style={{marginRight: 8}} />
          <Text style={styles.fabText}>Create Post</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileButton: {
    marginRight: 8,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
  },
  title: {
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
  },
  toggleButton: {
    marginLeft: 8,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardImage: {
    height: 200,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaText: {
    color: "#666",
  },
  tipsText: {
    color: "#2196F3",
    marginTop: 4,
    fontWeight: "bold",
  },
  markerContainer: {
    alignItems: "center",
  },
  fabContainer: {
    position: "absolute",
    right: 16,
    bottom: 32,
  },
  fab: {
    backgroundColor: "#2196F3",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
  },
  fabText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "bold",
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
