import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text, Card, Button, MD3DarkTheme } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { useAuthorization } from "../utils/useAuthorization";
import { useNavigation } from "@react-navigation/native";
import { demoPostStore } from "../services/demoPostStore";
import { irysService } from "../services/irysService";
import { useAppMode } from "../context/AppModeContext";

const DEMO_IMG_1 = require("../../assets/demo1.png");
const DEMO_IMG_2 = require("../../assets/demo2.png");

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

// Haversine distance in meters
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  const { mode } = useAppMode();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [posts, setPosts] = useState<GeoPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [isLoadingRealPosts, setIsLoadingRealPosts] = useState(false);
  const latestLocation = React.useRef<Location.LocationObject | null>(null);

  const createMockPosts = useCallback((lat: number, long: number) => {
    const now = Date.now();
    return [
      {
        id: "demo-1",
        latitude: lat + 0.0002,
        longitude: long + 0.0002,
        photoUrl: Image.resolveAssetSource(DEMO_IMG_1).uri,
        memo: "Checking out this cool spot! The view is amazing.",
        creator: "7xKX...2CW8",
        timestamp: now - 3600000,
        expiry: now + 6 * 86400000,
        tips: 150,
      },
      {
        id: "demo-2",
        latitude: lat - 0.0003,
        longitude: long - 0.0001,
        photoUrl: Image.resolveAssetSource(DEMO_IMG_2).uri,
        memo: "Found a hidden gem here. Great coffee nearby too!",
        creator: "ABC1...3XYZ",
        timestamp: now - 86400000,
        expiry: now + 5 * 86400000,
        tips: 75,
      },
    ].map((post) => ({
      ...post,
      distance: haversine(lat, long, post.latitude, post.longitude),
    }));
  }, []);

  const encodeGeohash = (lat: number, lon: number, precision: number): string => {
    const chars = "0123456789bcdefghjkmnpqrstuvwxyz";
    let geohash = "";
    let minLat = -90, maxLat = 90;
    let minLon = -180, maxLon = 180;
    let isEven = true;

    while (geohash.length < precision) {
      let charIndex = 0;
      for (let i = 0; i < 5; i++) {
        if (isEven) {
          const mid = (minLon + maxLon) / 2;
          if (lon >= mid) {
            charIndex = charIndex * 2 + 1;
            minLon = mid;
          } else {
            charIndex = charIndex * 2;
            maxLon = mid;
          }
        } else {
          const mid = (minLat + maxLat) / 2;
          if (lat >= mid) {
            charIndex = charIndex * 2 + 1;
            minLat = mid;
          } else {
            charIndex = charIndex * 2;
            maxLat = mid;
          }
        }
        isEven = !isEven;
      }
      geohash += chars[charIndex];
    }
    return geohash;
  };

  const updatePosts = useCallback(async (loc: Location.LocationObject) => {
    if (mode === "demo") {
      // Demo mode: use mock posts
      const standardMocks = createMockPosts(loc.coords.latitude, loc.coords.longitude);
      const userMocks = demoPostStore.getPosts().map(p => ({
        ...p,
        distance: haversine(loc.coords.latitude, loc.coords.longitude, p.latitude, p.longitude)
      }));

      const combined = [...userMocks, ...standardMocks].sort((a, b) => b.timestamp - a.timestamp);
      setPosts(combined);
    } else {
      // Real mode: query from Irys
      setIsLoadingRealPosts(true);
      try {
        const geohash = encodeGeohash(loc.coords.latitude, loc.coords.longitude, 5); // 5 chars = ~2.4km
        const realPosts = await irysService.queryPostsByGeohash(geohash, mode);

        const postsWithDistance = realPosts.map(p => ({
          ...p,
          distance: haversine(loc.coords.latitude, loc.coords.longitude, p.latitude, p.longitude)
        })).filter(p => (p.distance || 0) < 1000); // Only show posts within 1km

        setPosts(postsWithDistance.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error("Failed to load real posts:", error);
        // Fallback to empty list
        setPosts([]);
      } finally {
        setIsLoadingRealPosts(false);
      }
    }
  }, [createMockPosts, mode]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;
    let postsGenerated = false;

    const handleLocationUpdate = (loc: Location.LocationObject) => {
      if (!isMounted) return;

      setLocation(loc);
      latestLocation.current = loc;

      if (!postsGenerated) {
        updatePosts(loc);
        postsGenerated = true;
      }
    };

    // Also subscribe to changes in user-created posts
    const unsubscribe = demoPostStore.subscribe(() => {
      if (isMounted && latestLocation.current) {
        updatePosts(latestLocation.current);
      }
    });

    const initLocation = async () => {
      try {
        // Check permission status first (non-blocking)
        let { status } = await Location.getForegroundPermissionsAsync();

        // Request only if not already granted
        if (status !== "granted") {
          const result = await Location.requestForegroundPermissionsAsync();
          status = result.status;
        }

        if (status !== "granted") {
          Alert.alert("Permission Denied", "Using demo location.");
          const fallbackLoc: Location.LocationObject = {
            coords: {
              latitude: 37.7749,
              longitude: -122.4194,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          };
          handleLocationUpdate(fallbackLoc);
          return;
        }

        // Get fresh current position (not cached)
        try {
          const currentPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          handleLocationUpdate(currentPos);
        } catch (e) {
          // If getCurrentPosition fails, try lastKnown as fallback
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (lastKnown) {
            handleLocationUpdate(lastKnown);
          }
        }

        // Start watching with high accuracy
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
          (newLoc) => {
            handleLocationUpdate(newLoc);
          }
        );
      } catch (error) {
        console.warn("Location init error:", error);
        const fallbackLoc: Location.LocationObject = {
          coords: {
            latitude: 37.7749, longitude: -122.4194,
            altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null,
          },
          timestamp: Date.now(),
        };
        handleLocationUpdate(fallbackLoc);
      }
    };

    initLocation();

    return () => {
      isMounted = false;
      subscription?.remove();
      unsubscribe();
    };
  }, [updatePosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (location) {
      updatePosts(location);
    }
    setRefreshing(false);
  }, [location, updatePosts]);

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
    <View style={[styles.container, { backgroundColor: MD3DarkTheme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={[styles.title, { color: "#EAB308" }]}>
          GeoMemo
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={[styles.profileButton, { backgroundColor: "#1E293B" }]}
          >
            <Ionicons name="person-circle" size={32} color="#EAB308" />
          </TouchableOpacity>
          <View style={styles.toggleContainer}>
            <Button
              mode={viewMode === "map" ? "contained" : "outlined"}
              onPress={() => setViewMode("map")}
              style={styles.toggleButton}
              buttonColor={viewMode === "map" ? "#EAB308" : "transparent"}
              textColor={viewMode === "map" ? "#000" : "#EAB308"}
            >
              Map
            </Button>
            <Button
              mode={viewMode === "list" ? "contained" : "outlined"}
              onPress={() => setViewMode("list")}
              style={styles.toggleButton}
              buttonColor={viewMode === "list" ? "#EAB308" : "transparent"}
              textColor={viewMode === "list" ? "#000" : "#EAB308"}
            >
              List
            </Button>
          </View>
        </View>
      </View>

      {viewMode === "map" ? (
        <MapView
          style={styles.map}
          userInterfaceStyle="dark"
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
              >
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerInner} />
                </View>
              </Marker>
              <Circle
                center={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                radius={100}
                fillColor="rgba(59, 130, 246, 0.1)"
                strokeColor="rgba(59, 130, 246, 0.4)"
              />
            </>
          )}
          {posts.map((post) => (
            <Marker
              key={post.id}
              coordinate={{ latitude: post.latitude, longitude: post.longitude }}
              onPress={() => navigation.navigate("PostDetail", { post })}
            >
              <View style={[styles.markerContainer, { backgroundColor: '#EAB308' }]}>
                <Ionicons name="location" size={24} color="#000" />
              </View>
            </Marker>
          ))
          }
        </MapView>
      ) : (
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
              <Text variant="bodyLarge" style={{ color: "#F8FAFC" }}>
                {isLoadingRealPosts ? "Loading posts..." : "No posts nearby"}
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                {mode === "real"
                  ? "Be the first to create a GeoMemo in this area!"
                  : "Walk around to discover GeoMemos within 100m"}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <View style={[styles.fab, { backgroundColor: "#EAB308" }]}>
          <Ionicons name="add-circle" size={24} color="#000" />
          <Text style={[styles.fabText, { color: "#000" }]}>Create Post</Text>
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
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    marginHorizontal: 0,
    height: 36,
    borderRadius: 18,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  cardImage: {
    height: 200,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaText: {
    color: "#94A3B8",
  },
  tipsText: {
    color: "#EAB308",
    marginTop: 6,
    fontWeight: "bold",
  },
  markerContainer: {
    alignItems: "center",
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.5)",
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 32,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  fabText: {
    marginLeft: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 14,
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  emptySubtext: {
    color: "#94A3B8",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  modeIndicator: {
    marginTop: 16,
    color: "#EAB308",
    fontWeight: "bold",
  },
});
