import 'dotenv/config';

export default {
  expo: {
    name: "GeoMemo",
    slug: "GeoMemo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow GeoMemo to access your camera to capture photos at locations."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow GeoMemo to use your location to discover and create location-based posts."
        }
      ],
      "expo-asset",
      "expo-font"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.geomemo.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.geomemo.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    }
  }
};
