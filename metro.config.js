// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Store the original resolver before we override it
const originalResolveRequest = config.resolver.resolveRequest;

// Custom resolver to handle problematic imports
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force axios to use browser build instead of Node build
  if (moduleName === 'axios') {
    return context.resolveRequest(context, 'axios/dist/browser/axios.cjs', platform);
  }
  
  // Use original resolver for everything else to avoid infinite loops
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  
  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
