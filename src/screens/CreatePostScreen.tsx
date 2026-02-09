import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  PermissionsAndroid,
} from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { irysService } from "../services/irysService";
import { useAppMode } from "../context/AppModeContext";

export function CreatePostScreen() {
  const navigation = useNavigation();
  const { selectedAccount, authorizeSession } = useAuthorization();
  const { transact } = useMobileWallet();
  const { mode } = useAppMode();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (permission?.granted) {
      requestLocationPermission();
    }
  }, [permission]);

  const requestLocationPermission = async () => {
    try {
      // Check permission status first (non-blocking)
      let { status } = await Location.getForegroundPermissionsAsync();

      // Request only if not already granted
      if (status !== "granted") {
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status;
      }

      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);
      }
    } catch (error) {
      console.error("Location permission error:", error);
    }
  };

  const handleRequestPermission = useCallback(async () => {
    try {
      setPermissionError(null);

      if (Platform.OS === "android") {
        // Use native Android permission API
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "GeoMemo needs access to your camera to take photos at locations.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          // Set local state to trigger re-render
          setPermissionGranted(true);
          // Also refresh expo-camera permission
          await requestPermission();
        } else if (result === PermissionsAndroid.RESULTS.DENIED) {
          setPermissionError("Camera permission was denied. Please enable it in Settings.");
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setPermissionError("Camera permission is permanently denied. Please enable it in Settings → Apps → GeoMemo → Permissions.");
        }
      } else {
        // iOS - use expo-camera's requestPermission
        const result = await requestPermission();
        if (result.granted) {
          setPermissionGranted(true);
        } else {
          setPermissionError("Camera permission was denied.");
        }
      }
    } catch (error) {
      console.error("Permission request error:", error);
      setPermissionError("Failed to request camera permission.");
    }
  }, [requestPermission]);

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      if (photo?.uri) {
        setPhoto(photo.uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take picture");
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setCameraReady(false);
  };

  const submitPost = async () => {
    if (!photo || !location || !selectedAccount) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    if (!memo.trim()) {
      Alert.alert("Error", "Please add a memo");
      return;
    }

    setIsUploading(true);

    try {
      // Initialize Irys with wallet provider and create post
      await transact(async (wallet) => {
        const auth = await authorizeSession(wallet);
        if (auth) {
          await irysService.initialize(auth, mode);
        }

        // Create post on Irys (demo or real mode)
        const postId = await irysService.createPost(
          photo,
          memo.trim(),
          location.coords.latitude,
          location.coords.longitude,
          selectedAccount.address,
          mode === "real" ? async (tx) => {
            const signatures = await wallet.signAndSendTransactions({
              transactions: [tx],
            });
            return signatures[0];
          } : undefined
        );

        // Success message depends on mode
        if (mode === "real") {
          console.log("Post created on Arweave:", postId);
        } else {
          console.log("Post created in demo mode:", postId);
        }
      });

      const successMessage = mode === "real" 
        ? "Your GeoMemo has been permanently stored on Arweave!"
        : "Your GeoMemo has been posted (demo mode)!";

      Alert.alert("Success", successMessage, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Failed to create post:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to create post. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Check both hook permission and local state
  const hasCameraPermission = permission?.granted || permissionGranted;

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hasCameraPermission) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={styles.permissionText}>
          Camera permission is required to create GeoMemos
        </Text>
        {permissionError && (
          <Text variant="bodyMedium" style={styles.errorText}>
            {permissionError}
          </Text>
        )}
        <Button mode="contained" onPress={handleRequestPermission}>
          Grant Permission
        </Button>
      </View>
    );
  }

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
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
            >
              <View style={styles.cameraOverlay}>
                <Text variant="bodyMedium" style={styles.locationText}>
                  {location
                    ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                    : "Getting location..."}
                </Text>
              </View>
            </CameraView>
            <Button
              mode="contained"
              onPress={takePicture}
              style={styles.captureButton}
              disabled={!cameraReady || !location}
            >
              Take Photo
            </Button>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photo }} style={styles.preview} />
            <Button mode="outlined" onPress={retakePhoto} style={styles.retakeButton}>
              Retake
            </Button>
          </View>
        )}

        {photo && (
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.label}>
              Add a memo
            </Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="What's special about this location?"
              value={memo}
              onChangeText={setMemo}
              maxLength={280}
            />
            <Text variant="bodySmall" style={styles.charCount}>
              {memo.length}/280
            </Text>

            <View style={styles.infoBox}>
              <Text variant="bodySmall" style={styles.infoText}>
                {mode === "real"
                  ? "This post will be permanently stored on Arweave. Estimated cost: ~0.0002 SOL (actual cost shown in wallet before signing). Visible to others within 100m for 7 days."
                  : "Demo mode: This post is stored locally only and will not be visible to other users"}
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={submitPost}
              loading={isUploading}
              disabled={isUploading || !memo.trim()}
              style={styles.submitButton}
            >
              {isUploading ? "Posting..." : "Post GeoMemo"}
            </Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
    aspectRatio: 3 / 4,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  locationText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 4,
  },
  captureButton: {
    margin: 16,
  },
  previewContainer: {
    padding: 16,
  },
  preview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
  retakeButton: {
    marginTop: 16,
  },
  formContainer: {
    padding: 16,
    backgroundColor: "#fff",
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
  infoBox: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  infoText: {
    color: "#1976d2",
  },
  submitButton: {
    marginTop: 8,
  },
  permissionText: {
    marginBottom: 16,
    textAlign: "center",
    padding: 16,
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
});
