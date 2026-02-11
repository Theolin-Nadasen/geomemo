import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Text, Button } from "react-native-paper";
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useAppMode } from "../context/AppModeContext";
import { demoPostStore, ImageType } from "../services/demoPostStore";
import { supabaseService } from "../services/supabaseService";

// Bundled images
const POST_IMAGES = {
  good: require("../../assets/good.png"),
  bad: require("../../assets/bad.png"),
  general: require("../../assets/general.png"),
};

export function CreatePostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedAccount } = useAuthorization();
  const { mode } = useAppMode();

  // Get location from MapScreen (passed as param)
  const initialLocation = (route.params as any)?.location;
  
  const [selectedImage, setSelectedImage] = useState<ImageType>('general');
  const [memo, setMemo] = useState("");
  const [location, setLocation] = useState<Location.LocationObject | null>(initialLocation || null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Manual refresh location (optional)
  const refreshLocation = async () => {
    if (isRefreshingLocation) return;
    
    setIsRefreshingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc);
    } catch (e) {
      console.error("Failed to refresh location:", e);
      Alert.alert("Error", "Could not refresh location. Using previous location.");
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount) {
      Alert.alert("Error", "No wallet account selected. Please connect your wallet.");
      return;
    }
    if (!location) {
      Alert.alert("Error", "Location not available. Please try again.");
      return;
    }
    if (!memo.trim()) {
      Alert.alert("Error", "Please add a memo description.");
      return;
    }

    setIsUploading(true);
    try {
      if (mode === "demo") {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        demoPostStore.addPost({
          id: Math.random().toString(36).substring(7),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          memo: memo.trim(),
          timestamp: Date.now(),
          image_type: selectedImage,
          creator: selectedAccount.publicKey.toBase58(),
          expiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
          tips: 0,
        });

        Alert.alert("Success", "Memo posted (Demo Mode)");
        navigation.goBack();
        return;
      }

      // Real mode: use Supabase
      await supabaseService.createPost(
        selectedAccount.publicKey.toBase58(),
        location.coords.latitude,
        location.coords.longitude,
        memo.trim(),
        selectedImage
      );

      Alert.alert("Success", "Memo posted successfully!");
      navigation.goBack();
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", error.message || "Failed to post memo");
    } finally {
      setIsUploading(false);
    }
  };

  if (!selectedAccount) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge" style={{ color: "#F8FAFC" }}>Please connect your wallet first</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="titleLarge" style={styles.title}>Select Image Type</Text>
        
        <View style={styles.imageSelector}>
          {(Object.keys(POST_IMAGES) as ImageType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.imageOption,
                selectedImage === type && styles.selectedImage,
              ]}
              onPress={() => setSelectedImage(type)}
            >
              <Image source={POST_IMAGES[type]} style={styles.previewImage} />
              <Text style={styles.imageLabel}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.memoContainer}>
          <Text variant="titleMedium" style={styles.label}>Memo</Text>
          <TextInput
            style={styles.memoInput}
            multiline
            numberOfLines={4}
            placeholder="What's on your mind?"
            placeholderTextColor="#94A3B8"
            value={memo}
            onChangeText={setMemo}
            maxLength={280}
          />
          <Text style={styles.characterCount}>{memo.length}/280</Text>
        </View>

        <View style={styles.locationSection}>
          <Text variant="titleMedium" style={styles.label}>Location</Text>
          
          {location ? (
            <View style={styles.locationStatus}>
              <Text style={styles.locationText}>
                📍 {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </Text>
              <Button
                mode="text"
                onPress={refreshLocation}
                loading={isRefreshingLocation}
                textColor="#EAB308"
                style={styles.refreshButton}
              >
                Refresh Location
              </Button>
            </View>
          ) : (
            <View style={styles.locationStatus}>
              <Text style={styles.errorText}>Location not available</Text>
              <Button
                mode="outlined"
                onPress={refreshLocation}
                loading={isRefreshingLocation}
                style={styles.locationButton}
                textColor="#EAB308"
              >
                Get Location
              </Button>
            </View>
          )}
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isUploading}
          disabled={isUploading || !location}
          style={styles.submitButton}
          buttonColor="#EAB308"
          textColor="#000"
        >
          {isUploading ? "Posting..." : "Post Memo"}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    color: "#F8FAFC",
    marginBottom: 16,
    textAlign: "center",
  },
  imageSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  imageOption: {
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedImage: {
    borderColor: "#EAB308",
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 4,
  },
  imageLabel: {
    color: "#F8FAFC",
    fontSize: 12,
  },
  memoContainer: {
    marginBottom: 16,
  },
  label: {
    color: "#F8FAFC",
    marginBottom: 8,
  },
  memoInput: {
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  characterCount: {
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 4,
    fontSize: 12,
  },
  locationSection: {
    marginBottom: 24,
  },
  locationButton: {
    borderColor: "#EAB308",
    borderWidth: 2,
    marginTop: 8,
  },
  locationStatus: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  locationText: {
    color: "#94A3B8",
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: "#EF4444",
    marginBottom: 8,
  },
  refreshButton: {
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
  },
});
