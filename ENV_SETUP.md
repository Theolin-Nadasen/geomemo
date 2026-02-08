# Environment Variables Setup

## Google Maps API Key

The app requires a Google Maps API key for the map functionality to work on Android.

### Getting an API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Library"
4. Search for and enable **"Maps SDK for Android"**
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "API Key"
7. (Optional but recommended) Restrict the key to Android apps only

### Setting Up Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your API key:**
   ```
   GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
   ```

3. **Rebuild the app:**
   ```bash
   npx expo prebuild --platform android --clean
   npx expo run:android
   ```

### Security Notes

- **Never commit `.env` files to Git** - they're already in `.gitignore`
- If you accidentally pushed an API key to GitHub:
  1. Revoke the key in Google Cloud Console immediately
  2. Generate a new key
  3. Update your `.env` file with the new key
  4. Never commit the `.env` file

### Other Environment Variables

You can add other sensitive configuration to the `.env` file:
- API endpoints
- Third-party service keys
- Feature flags

Access them in code:
```typescript
import { Config } from './src/config/env';

const apiKey = Config.GOOGLE_MAPS_API_KEY;
```
