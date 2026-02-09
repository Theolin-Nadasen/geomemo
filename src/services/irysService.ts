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
   * In a full implementation, this would check the Irys node balance
   */
  async checkBalance(): Promise<{ funded: boolean; balance: number }> {
    if (this.currentMode === "demo") {
      return { funded: true, balance: 0 };
    }

    // For now, assume we need to fund for each upload
    // In production, you'd query the Irys node for actual balance
    return { funded: false, balance: 0 };
  }

  /**
   * Get estimated upload price
   * Uses conservative estimates instead of API calls for reliability
   */
  async getUploadPrice(bytes: number): Promise<number> {
    try {
      // Conservative estimates based on file size
      // These are higher than actual to ensure sufficient funding
      let estimatedPrice: number;
      
      if (bytes < 500 * 1024) {
        // Under 500KB: ~0.0001 SOL
        estimatedPrice = 0.0001;
      } else if (bytes < 2 * 1024 * 1024) {
        // 500KB - 2MB: ~0.0002 SOL
        estimatedPrice = 0.0002;
      } else {
        // Over 2MB: ~0.0005 SOL
        estimatedPrice = 0.0005;
      }
      
      console.log(`Estimated upload price for ${bytes} bytes: ${estimatedPrice} SOL`);
      return estimatedPrice;
    } catch (error) {
      console.error("Error calculating price estimate:", error);
      // Safe fallback - return a reasonable default
      return 0.0002;
    }
  }

  /**
   * Create a funding transaction for Irys
   * This returns a transaction that the wallet needs to sign
   */
  async createFundTransaction(
    amount: number,
    walletPublicKey: PublicKey
  ): Promise<Transaction> {
    if (!this.connection) {
      throw new Error("Not connected to Solana");
    }

    try {
      // Irys funding address on mainnet
      const IRYS_FUNDING_ADDRESS = new PublicKey("6yE2w89RU9VgLwJpR6kZJ71Vd9kGgtHk4UaJVq1zVH9C");
      
      const transaction = new Transaction();
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: IRYS_FUNDING_ADDRESS,
          lamports: Math.floor(amount * 1e9), // Convert SOL to lamports
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;

      return transaction;
    } catch (error) {
      console.error("Failed to create fund transaction:", error);
      throw new Error("Failed to create funding transaction");
    }
  }

  /**
   * Upload data to Irys after funding
   * This is a simplified implementation - full Irys SDK integration
   * would require bundlr client with proper signing
   */
  async uploadToIrys(
    data: Buffer,
    tags: { name: string; value: string }[],
    signedTransaction: Transaction
  ): Promise<string> {
    try {
      // In a full implementation, this would:
      // 1. Submit the signed funding transaction
      // 2. Wait for confirmation
      // 3. Use Irys SDK to upload with proper signing
      
      // For the hackathon demo, we'll use a simplified approach
      // that uploads via HTTP API with signed headers
      
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
      };
      
      // Add tags as headers
      tags.forEach(tag => {
        headers[`x-${tag.name}`] = tag.value;
      });

      // Add transaction signature as proof of funding
      // This is a simplified approach - full implementation would use Irys SDK
      const signature = signedTransaction.signature;
      if (signature) {
        headers["x-funding-signature"] = btoa(String.fromCharCode(...new Uint8Array(signature)));
      }

      // Convert Buffer to Uint8Array for React Native fetch compatibility
      const bodyData = new Uint8Array(data);

      const response = await fetch(`${IRYS_NODE}/tx/solana`, {
        method: "POST",
        headers,
        body: bodyData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error("Failed to upload to Irys:", error);
      throw error;
    }
  }

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
      
      // Read the image file using expo-file-system
      // Note: For production, you should resize the image before uploading
      // to save on Irys costs. expo-image-manipulator was causing build issues,
      // so we're reading the image directly for now.
      const base64Data = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log("Image size:", buffer.length, "bytes");
      
      // Warn if image is large
      if (buffer.length > 5 * 1024 * 1024) { // 5MB
        console.warn("Image is larger than 5MB. Consider resizing for cost savings.");
      }

      // Get upload price
      const price = await this.getUploadPrice(buffer.length);
      console.log("Upload price:", price, "SOL");

      // Create funding transaction
      if (!this.provider) {
        throw new Error("Provider not initialized");
      }
      const walletPublicKey = new PublicKey(this.provider.address);
      
      // Create tags
      const tags = [
        { name: "Content-Type", value: "image/jpeg" },
        { name: "App", value: APP_TAG },
        { name: "Type", value: "photo" },
        { name: "Creator", value: creator },
        { name: "Timestamp", value: Date.now().toString() },
      ];

      // Create a fund transaction
      const fundTx = await this.createFundTransaction(price, walletPublicKey);
      
      // Have wallet sign the funding transaction
      const signature = await signAndSendTransaction(fundTx);
      console.log("Funding transaction signed:", signature);

      // Upload with proof of funding
      const txId = await this.uploadToIrys(buffer, tags, fundTx);
      console.log("Real photo upload successful:", txId);
      
      return txId;
    } catch (error) {
      console.error("Failed to upload photo:", error);
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
    const expiry = timestamp + 7 * 24 * 60 * 60 * 1000; // 7 days
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

    if (!signAndSendTransaction) {
      throw new Error("Wallet signing function required for Real Mode");
    }

    try {
      // Upload photo first
      const photoTxId = await this.uploadPhoto(photoUri, creator, signAndSendTransaction);

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

      // Upload metadata
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const metadataPrice = await this.getUploadPrice(metadataBuffer.length);
      
      const walletPublicKey = new PublicKey(this.provider!.address);
      const fundTx = await this.createFundTransaction(metadataPrice, walletPublicKey);
      await signAndSendTransaction(fundTx);

      const tags = [
        { name: "Content-Type", value: "application/json" },
        { name: "App", value: APP_TAG },
        { name: "Type", value: "post" },
        { name: "Creator", value: creator },
        { name: "Geohash", value: geohash },
        { name: "Timestamp", value: timestamp.toString() },
        { name: "Photo-Tx", value: photoTxId },
      ];

      const txId = await this.uploadToIrys(metadataBuffer, tags, fundTx);
      console.log("Real post creation successful:", txId);
      
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
    // Querying posts doesn't require initialization - it's read-only
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

    if (!signAndSendTransaction) {
      throw new Error("Wallet signing function required for Real Mode");
    }

    try {
      const tipBuffer = Buffer.from(JSON.stringify(tipData));
      const price = await this.getUploadPrice(tipBuffer.length);
      
      const walletPublicKey = new PublicKey(this.provider!.address);
      const fundTx = await this.createFundTransaction(price, walletPublicKey);
      await signAndSendTransaction(fundTx);

      const tags = [
        { name: "Content-Type", value: "application/json" },
        { name: "App", value: APP_TAG },
        { name: "Type", value: "tip" },
        { name: "Post-Id", value: postId },
        { name: "Tipper", value: tipper },
        { name: "Amount", value: amount.toString() },
        { name: "Timestamp", value: tipData.timestamp.toString() },
      ];

      const txId = await this.uploadToIrys(tipBuffer, tags, fundTx);
      console.log("Real tip recorded:", txId);
      return txId;
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
