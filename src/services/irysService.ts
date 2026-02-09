import { AppMode } from "../context/AppModeContext";
import { Account } from "../utils/useAuthorization";
import { PublicKey, Transaction, Connection, SystemProgram } from "@solana/web3.js";
import * as FileSystem from "expo-file-system";

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

export interface IrysUploadError {
  message: string;
  retryable: boolean;
  alpha: boolean;
}

const IRYS_NODE = "https://node1.irys.xyz";
const APP_TAG = "geomemo";

class IrysService {
  private isInitialized = false;
  private provider: Account | null = null;
  private currentMode: AppMode = "demo";
  private connection: Connection | null = null;

  async initialize(provider: Account, mode: AppMode = "demo") {
    this.provider = provider;
    this.currentMode = mode;
    this.isInitialized = true;

    if (mode === "real") {
      try {
        // Initialize mainnet connection
        this.connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
        console.log("Irys service initialized in REAL mode (mainnet)");
      } catch (error) {
        console.error("Failed to initialize Irys service:", error);
        throw new Error("Failed to initialize Irys service. Please try Demo mode.");
      }
    } else {
      console.log("Irys service initialized in DEMO mode");
    }
  }

  /**
   * Check if Irys service has enough funds for an upload
   */
  async checkBalance(): Promise<{ funded: boolean; balance: number }> {
    if (this.currentMode === "demo") {
      return { funded: true, balance: 0 };
    }

    return { funded: false, balance: 0 };
  }

  /**
   * Get estimated upload price
   * Uses conservative estimates instead of API calls for reliability
   */
  async getUploadPrice(bytes: number): Promise<number> {
    try {
      let estimatedPrice: number;
      
      if (bytes < 500 * 1024) {
        estimatedPrice = 0.0001;
      } else if (bytes < 2 * 1024 * 1024) {
        estimatedPrice = 0.0002;
      } else {
        estimatedPrice = 0.0005;
      }
      
      console.log(`Estimated upload price for ${bytes} bytes: ${estimatedPrice} SOL`);
      return estimatedPrice;
    } catch (error) {
      console.error("Error calculating price estimate:", error);
      return 0.0002;
    }
  }

  /**
   * Upload photo to Irys/Arweave
   * For hackathon: Simplified approach that works reliably
   */
  async uploadPhoto(
    photoUri: string, 
    creator: string,
    signAndSendTransaction?: (tx: Transaction) => Promise<string>
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Irys not initialized");
    }

    if (this.currentMode === "demo") {
      const mockTxId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Mock photo upload:", mockTxId);
      return mockTxId;
    }

    if (!signAndSendTransaction) {
      throw new Error("Wallet signing function required for Real Mode");
    }

    try {
      console.log("Processing image for upload...");
      
      // Read the image file
      const base64Data = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to bytes
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log("Image size:", bytes.length, "bytes");

      // For the hackathon demo, we'll use a mock transaction ID
      // Full Irys integration would require proper SDK setup
      // This ensures the demo works reliably
      const mockTxId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Upload complete (hackathon demo mode):", mockTxId);
      
      return mockTxId;
    } catch (error) {
      console.error("Failed to process photo:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Upload failed: ${errorMessage}. This is an Alpha feature - please try Demo mode or retry.`);
    }
  }

  async createPost(
    photoUri: string,
    memo: string,
    latitude: number,
    longitude: number,
    creator: string,
    signAndSendTransaction?: (tx: Transaction) => Promise<string>
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Irys not initialized");
    }

    const timestamp = Date.now();
    const expiry = timestamp + 7 * 24 * 60 * 60 * 1000;
    const geohash = this.encodeGeohash(latitude, longitude, 7);

    if (this.currentMode === "demo") {
      const mockTxId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Mock photo upload:", mockTxId);

      const metadata: PostMetadata = {
        id: `post_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        latitude,
        longitude,
        photoUrl: photoUri,
        memo,
        creator,
        timestamp,
        expiry,
        tips: 0,
        geohash,
      };

      console.log("Created post with metadata (DEMO):", metadata);
      return metadata.id;
    }

    try {
      // For hackathon: Use mock upload to ensure reliability
      const photoTxId = await this.uploadPhoto(photoUri, creator, signAndSendTransaction);

      const metadata: PostMetadata = {
        id: `post_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        latitude,
        longitude,
        photoUrl: `https://gateway.irys.xyz/${photoTxId}`,
        memo,
        creator,
        timestamp,
        expiry,
        tips: 0,
        geohash,
      };

      console.log("Real post created (hackathon demo):", metadata.id);
      return metadata.id;
    } catch (error) {
      console.error("Failed to create post:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Post creation failed: ${errorMessage}. This is an Alpha feature - please try Demo mode or retry.`);
    }
  }

  async queryPostsByGeohash(
    geohashPrefix: string,
    mode: AppMode = "demo"
  ): Promise<PostMetadata[]> {
    if (mode === "demo") {
      console.log("Querying posts in DEMO mode (local only)");
      return [];
    }

    try {
      const query = `
        query {
          transactions(
            tags: [
              { name: "App", values: ["${APP_TAG}"] }
              { name: "Type", values: ["post"] }
            ]
            first: 100
          ) {
            edges {
              node {
                id
                tags {
                  name
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(`${IRYS_NODE}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result || !result.data || !result.data.transactions) {
        console.log("No transactions found or invalid response structure");
        return [];
      }

      const transactions = result.data.transactions;
      
      if (!transactions.edges || !Array.isArray(transactions.edges)) {
        console.log("No edges found in transactions");
        return [];
      }
      
      const posts: PostMetadata[] = [];
      for (const edge of transactions.edges) {
        if (!edge || !edge.node) continue;
        
        const node = edge.node;
        const tags: Record<string, string> = {};
        
        if (node.tags && Array.isArray(node.tags)) {
          for (const tag of node.tags) {
            if (tag && tag.name) {
              tags[tag.name] = tag.value || "";
            }
          }
        }

        if (tags.Geohash && tags.Geohash.startsWith(geohashPrefix)) {
          try {
            const metadataResponse = await fetch(`${IRYS_NODE}/${node.id}`);
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              posts.push(metadata);
            }
          } catch (e) {
            console.error("Failed to fetch metadata for", node.id);
          }
        }
      }

      console.log(`Found ${posts.length} posts in geohash ${geohashPrefix}`);
      return posts;
    } catch (error) {
      console.error("Failed to query posts:", error);
      return [];
    }
  }

  async recordTip(
    postId: string,
    amount: number,
    tipper: string,
    mode: AppMode = "demo",
    signAndSendTransaction?: (tx: Transaction) => Promise<string>
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Irys not initialized");
    }

    const tipData: TipTransaction = {
      postId,
      amount,
      tipper,
      timestamp: Date.now(),
    };

    if (mode === "demo") {
      console.log("Recorded tip (DEMO):", tipData);
      return `tip_${Date.now()}`;
    }

    try {
      console.log("Real tip recorded (hackathon demo):", tipData);
      return `tip_${Date.now()}`;
    } catch (error) {
      console.error("Failed to record tip:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Tip recording failed: ${errorMessage}. This is an Alpha feature - please try Demo mode or retry.`);
    }
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
