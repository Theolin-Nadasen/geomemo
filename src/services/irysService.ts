// Simplified Irys service - bypassing SDK import issues for now
// This maintains the interface while using mock functionality for development

export interface PostMetadata {
  id: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  memo: string;
  creator: string;
  timestamp: number;
  expiry: number;
  tips: number;
  geohash: string;
}

export interface TipTransaction {
  postId: string;
  amount: number;
  tipper: string;
  timestamp: number;
}

const IRYS_NODE = "https://node1.irys.xyz";
const APP_TAG = "geomemo";

class IrysService {
  private isInitialized = false;
  private provider: any = null;

  async initialize(provider: any) {
    this.provider = provider;
    this.isInitialized = true;
    console.log("Irys service initialized (mock mode)");
  }

  async uploadPhoto(photoUri: string, creator: string): Promise<string> {
    if (!this.isInitialized) throw new Error("Irys not initialized");

    // Mock upload - in production, this would upload to Irys
    const mockTxId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log("Mock photo upload:", mockTxId);
    return mockTxId;
  }

  async createPost(
    photoUri: string,
    memo: string,
    latitude: number,
    longitude: number,
    creator: string
  ): Promise<string> {
    if (!this.isInitialized) throw new Error("Irys not initialized");

    const timestamp = Date.now();
    const expiry = timestamp + 7 * 24 * 60 * 60 * 1000; // 7 days
    const geohash = this.encodeGeohash(latitude, longitude, 7);

    // Upload photo first (mock)
    const photoTxId = await this.uploadPhoto(photoUri, creator);

    // Create metadata
    const metadata: PostMetadata = {
      id: `post_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      latitude,
      longitude,
      photoUrl: `${IRYS_NODE}/${photoTxId}`,
      memo,
      creator,
      timestamp,
      expiry,
      tips: 0,
      geohash,
    };

    console.log("Created post with metadata:", metadata);
    
    // In production, upload to Irys with tags
    // Mock return
    return metadata.id;
  }

  async queryPostsByGeohash(geohashPrefix: string): Promise<PostMetadata[]> {
    if (!this.isInitialized) throw new Error("Irys not initialized");

    // Mock query - in production, query Irys GraphQL API
    return [];
  }

  async recordTip(postId: string, amount: number, tipper: string): Promise<string> {
    if (!this.isInitialized) throw new Error("Irys not initialized");

    const tipData: TipTransaction = {
      postId,
      amount,
      tipper,
      timestamp: Date.now(),
    };

    console.log("Recorded tip:", tipData);
    return `tip_${Date.now()}`;
  }

  private encodeGeohash(lat: number, lon: number, precision: number): string {
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
  }
}

export const irysService = new IrysService();
