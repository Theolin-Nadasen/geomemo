import 'dotenv/config';

export default {
  expo: {
    name: "GeoMemo",
    slug: "GeoMemo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    scheme: "geomemo",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
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
      [
        "expo-image-picker",
        {
          photosPermission: "Allow GeoMemo to access your photos to share them at locations.",
          cameraPermission: "Allow GeoMemo to access your camera to capture photos at locations."
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
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#000000"
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
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "geomemo",
              host: "*"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    }
  }
};
