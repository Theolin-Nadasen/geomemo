# GeoMemo

Location-based photo and memo sharing app for Solana Mobile devices. Users can drop permanent photo-memos at real-world locations for others to discover within 100 meters.

## Features

- 📸 **Create Posts**: Take photos with GPS coordinates and attach memos
- 🗺️ **Discover**: View nearby posts on a map or in a list within 100m radius
- 💰 **Tip with SKR**: Show appreciation by tipping creators with SKR tokens
- ⏰ **7-Day Expiry**: Posts are discoverable for 7 days, then expire (on-chain proof remains permanent)
- 🔐 **Solana Integration**: Connect with Mobile Wallet Adapter for authentication and transactions

## Tech Stack

- **Framework**: React Native + Expo
- **Blockchain**: Solana (Mobile Wallet Adapter, SPL Token)
- **Storage**: Irys (Arweave)
- **Maps**: React Native Maps
- **Camera**: Expo Camera
- **Location**: Expo Location

## Installation

```bash
# Install dependencies
npm install

# For iOS (macOS only)
npx expo prebuild --platform ios

# For Android
npx expo prebuild --platform android
```

## Running the App

### Development

```bash
# Start the development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (macOS only)
npx expo run:ios
```

### Android Emulator Setup

1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Launch an emulator
4. Keep it running while developing

## Project Structure

```
src/
├── screens/           # Screen components
│   ├── MapScreen.tsx         # Main map/list view
│   ├── CreatePostScreen.tsx  # Create new posts
│   ├── PostDetailScreen.tsx  # View post details & tip
│   └── ...
├── services/          # Business logic
│   └── irysService.ts        # Irys upload/query functions
├── utils/             # Utilities
│   ├── useAuthorization.tsx  # Wallet auth hook
│   └── ...
└── navigators/        # Navigation setup
```

## Configuration

### Irys

The app uses Irys for decentralized storage. Posts and photos are uploaded to Irys with metadata tags for querying.

### SKR Token

- **Mint**: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- Used for tipping creators
- Transferred via SPL Token program

## Development Notes

- Posts expire after 7 days (configurable in code)
- Discovery radius is 100 meters
- Geohash precision 7 used for storage, precision 6 for queries
- Requires camera and location permissions

## License

MIT
