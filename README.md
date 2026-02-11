# GeoMemo

Location-based memo sharing app for Solana Mobile devices. Users can drop memos at real-world locations for others to discover within 100 meters.

## Features

- 📝 **Create Posts**: Write memos with GPS coordinates and select from 3 image types (Good, Bad, General)
- 🗺️ **Discover**: View nearby posts on a map or in a list within 100m radius
- 💰 **Tip with SKR**: Show appreciation by tipping creators with SKR tokens
- ⏰ **7-Day Expiry**: Posts are discoverable for 7 days, then expire
- 🔐 **Solana Integration**: Connect with Mobile Wallet Adapter for authentication and transactions
- 🎨 **Visual Indicators**: Posts use color-coded images (Green=Good, Red=Bad, Gray=General)

## Tech Stack

- **Framework**: React Native + Expo SDK 52
- **Blockchain**: Solana (Mobile Wallet Adapter, SPL Token)
- **Storage**: Supabase (PostgreSQL database)
- **Maps**: React Native Maps with Google Maps
- **Location**: Expo Location
- **UI**: React Native Paper (Material Design)

## Prerequisites

- Node.js (v18+)
- Supabase account (free tier works)
- Solana wallet with SKR tokens (for real mode)

## Installation

```bash
# Install dependencies
npm install

# For iOS (macOS only)
npx expo prebuild --platform ios

# For Android
npx expo prebuild --platform android
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `src/services/supabaseService.ts` with your credentials
4. Run the SQL setup script in Supabase SQL Editor:
   - Open `supabase-setup.sql`
   - Copy contents to Supabase SQL Editor
   - Click "Run"

### Database Schema

The SQL script creates:
- `posts` table - stores post data with geohash for location queries
- `tips` table - stores tip transactions
- Indexes for fast geohash and location queries
- Row Level Security policies

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
│   ├── ProfileScreen.tsx     # User profile
│   └── SettingsScreen.tsx    # App settings
├── services/          # Business logic
│   ├── supabaseService.ts    # Supabase database operations
│   ├── demoPostStore.ts      # In-memory store for demo mode
│   └── tokenService.ts       # SKR token operations
├── utils/             # Utilities
│   ├── useAuthorization.tsx  # Wallet auth hook
│   ├── useMobileWallet.tsx   # Mobile wallet adapter
│   └── ConnectionProvider.tsx # Solana connection
├── components/        # Reusable components
│   ├── cluster/              # Cluster selection
│   └── mode-indicator/       # Demo/Real mode indicator
├── context/           # React Context
│   └── AppModeContext.tsx    # Demo/Real mode state
└── navigators/        # Navigation setup
    └── AppNavigator.tsx
```

## App Modes

### Demo Mode
- Posts stored locally (in-memory)
- Simulated tips (no real transactions)
- Great for testing without spending SOL

### Real Mode
- Posts stored in Supabase
- Real SKR token transfers for tips
- Requires wallet with SOL for transaction fees

## Configuration

### Supabase
- Posts table: stores memo, location (lat/lng), geohash, image type, creator, timestamps
- Tips table: stores tip transactions with amount and tipper
- Geohash used for efficient location-based queries

### SKR Token
- **Mint**: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- Used for tipping creators in Real mode
- Transferred via SPL Token program

### Images
Three bundled images used for all posts:
- `assets/good.png` - Green indicator for positive posts
- `assets/bad.png` - Red indicator for negative posts
- `assets/general.png` - Gray indicator for neutral posts

## Development Notes

- Posts expire after 7 days (timestamp-based)
- Discovery radius is 100 meters from user's location
- Geohash precision 5 used for queries (~2.4km precision)
- Requires location permissions for creating and discovering posts
- Demo mode stores posts in memory (lost on app restart)
- Real mode stores posts in Supabase (persistent)

## License

MIT
