import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { irysService } from "../services/irysService";
import { useAppMode } from "../context/AppModeContext";
import { demoPostStore } from "../services/demoPostStore";

export function CreatePostScreen() {
  const navigation = useNavigation();
  const { selectedAccount } = useAuthorization();
  const { transact } = useMobileWallet();
  const { mode } = useAppMode();

  const [photo, setPhoto] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (mode === "demo") {
          // In demo mode, we just use a fallback if they say no
          return;
        }
        Alert.alert(
          "Permission required",
          "This app needs location permissions to geolocate your memos."
        );
        return;
      }

      // Try for 5 seconds to get a high-accuracy fix
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 5000,
        });
        setLocation(loc);
      } catch (e) {
        // Fallback to last known position if fresh fix fails
        console.warn("High accuracy fix failed, trying fallback...", e);
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setLocation(lastKnown);
        } else {
          // One last try with lower accuracy
          try {
            const lowAcc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              timeout: 5000,
            });
            setLocation(lowAcc);
          } catch (e2) {
            console.error("All location attempts failed", e2);
          }
        }
      }
    } catch (error) {
      console.error("Location permission error:", error);
    }
  };

  const pickImage = async () => {
    if (isSelecting) return;

    setIsSelecting(true);
    try {
      console.log("Launching image library...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log("ImagePicker result returned. Canceled:", result.canceled);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        console.log("Selected URI:", selectedUri);

        // Copy to permanent storage to ensure it persists correctly
        const filename = `photo_${Date.now()}.jpg`;
        const permanentUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({
          from: selectedUri,
          to: permanentUri,
        });

        setPhoto(permanentUri);
      }
    } catch (error: any) {
      console.error("Failed to pick image:", error);
      Alert.alert("Error", `Could not select image: ${error.message || "Unknown error"}`);
    } finally {
      setIsSelecting(false);
    }
  };

  const useDemoPhoto = () => {
    const demoPhotos = [
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop",
    ];
    const randomPhoto = demoPhotos[Math.floor(Math.random() * demoPhotos.length)];
    setPhoto(randomPhoto);

    // Ensure we have a location for the demo post if GPS is still fetching
    if (!location) {
      const demoLoc: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 0,
          accuracy: 5,
          altitudeAccuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };
      setLocation(demoLoc);
      Alert.alert("Demo Mode", "Using a placeholder photo and demo coordinates (San Francisco).");
    } else {
      Alert.alert("Demo Mode", "Using a placeholder photo.");
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
  };

  const handleSubmit = async () => {
    if (!selectedAccount) {
      Alert.alert("Error", "No wallet account selected. Please connect your wallet.");
      return;
    }
    if (!photo) {
      Alert.alert("Error", "Please select a photo first.");
      return;
    }
    if (!location) {
      Alert.alert("Error", "Location not found. Please wait for a GPS signal or check permissions.");
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
          photoUrl: photo,
          creator: selectedAccount.publicKey.toBase58(),
          expiry: Date.now() + 24 * 60 * 60 * 1000,
          tips: 0,
        });

        Alert.alert("Success", "Memo posted (Demo Mode)");
        navigation.goBack();
        return;
      }

      const postTxId = await irysService.createPost(
        photo,
        memo.trim(),
        location.coords.latitude,
        location.coords.longitude,
        selectedAccount.publicKey.toBase58(),
        async (tx) => {
          return await transact(async (wallet) => {
            const [signedTx] = await wallet.signAndSendTransactions({
              transactions: [tx],
            });
            return signedTx;
          });
        }
      );

      if (postTxId) {
        Alert.alert("Success", "Memo posted successfully!");
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", error.message || "Failed to post memo");
    } finally {
      setIsUploading(false);
    }
  };

  if (!selectedAccount) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge">Please connect your wallet first</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!photo ? (
          <View style={styles.cameraPlaceholder}>
            <IconButton icon="image-plus" size={64} mode="contained" onPress={pickImage} />
            <Text variant="headlineSmall" style={styles.placeholderText}>
              Select a Photo
            </Text>
            <Text variant="bodyMedium" style={styles.placeholderSubtext}>
              Choose a moment from your gallery to share
            </Text>

            <View style={styles.buttonGroup}>
              <Button
                mode="contained"
                onPress={pickImage}
                style={styles.captureButton}
                disabled={isSelecting}
                loading={isSelecting}
              >
                Open Gallery
              </Button>

              {mode === "demo" && (
                <Button
                  mode="outlined"
                  onPress={useDemoPhoto}
                  style={styles.demoButton}
                  disabled={isSelecting}
                >
                  Use Demo Photo
                </Button>
              )}
            </View>

            {location ? (
              <Text variant="bodySmall" style={styles.locationTag}>
                📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            ) : (
              <Text variant="bodySmall" style={[styles.locationTag, { backgroundColor: '#fff3e0', color: '#e65100' }]}>
                ⌛ Fetching GPS location...
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} />
            <Button mode="outlined" onPress={retakePhoto} style={styles.retakeButton}>
              Choose Different Photo
            </Button>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text variant="labelLarge" style={styles.label}>
            Add a memo...
          </Text>
          <TextInput
            style={styles.input}
            placeholder="What's happening at this location?"
            value={memo}
            onChangeText={setMemo}
            multiline
            maxLength={280}
            editable={!isUploading}
          />
          <Text variant="bodySmall" style={styles.charCount}>
            {memo.length}/280
          </Text>

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={isUploading}
            disabled={!photo || !memo.trim() || isUploading}
          >
            {mode === "demo" ? "Post (Demo Mode)" : "Post Memo"}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  cameraPlaceholder: {
    height: 380,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  placeholderText: {
    marginTop: 16,
    fontWeight: "600",
  },
  placeholderSubtext: {
    textAlign: "center",
    marginTop: 8,
    color: "#666",
    marginBottom: 24,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  locationTag: {
    marginTop: 16,
    color: "#1976d2",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  captureButton: {
    width: "100%",
  },
  demoButton: {
    width: "100%",
  },
  photoContainer: {
    height: 440,
    padding: 16,
  },
  photoPreview: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#000",
    resizeMode: "cover",
  },
  retakeButton: {
    marginTop: 12,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    marginTop: 4,
    color: "#666",
  },
  submitButton: {
    marginTop: 24,
  },
});
