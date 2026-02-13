import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Account } from "../utils/useAuthorization";

const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const DECIMALS = 6; // SKR token uses 6 decimals

export interface TokenTransferResult {
  signature: string;
  success: boolean;
}

export interface TokenBalance {
  amount: number;
  uiAmount: number;
}

class TokenService {
  private connection: Connection;

  constructor() {
    // Use mainnet connection
    this.connection = new Connection(
      "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
  }

  async getSKRBalance(walletAddress: string): Promise<TokenBalance> {
    try {
      const owner = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(SKR_MINT, owner);

      try {
        const account = await getAccount(this.connection, tokenAccount);
        const amount = Number(account.amount);
        const uiAmount = amount / Math.pow(10, DECIMALS);

        return {
          amount,
          uiAmount,
        };
      } catch (error) {
        // Token account doesn't exist
        return {
          amount: 0,
          uiAmount: 0,
        };
      }
    } catch (error) {
      console.error("Failed to get SKR balance:", error);
      return {
        amount: 0,
        uiAmount: 0,
      };
    }
  }

  async buildTransferTransaction(
    fromWallet: Account,
    toAddress: string,
    amount: number
  ): Promise<Transaction> {
    try {
      console.log("[TOKEN] Building transaction...");
      console.log("[TOKEN] From:", fromWallet.publicKey.toBase58());
      console.log("[TOKEN] To:", toAddress);
      console.log("[TOKEN] Amount:", amount);
      
      const fromPublicKey = fromWallet.publicKey;
      const toPublicKey = new PublicKey(toAddress);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        SKR_MINT,
        fromPublicKey
      );
      const toTokenAccount = await getAssociatedTokenAddress(
        SKR_MINT,
        toPublicKey
      );
      
      console.log("[TOKEN] From token account:", fromTokenAccount.toBase58());
      console.log("[TOKEN] To token account:", toTokenAccount.toBase58());

      const transaction = new Transaction();

      // Check if recipient token account exists
      try {
        console.log("[TOKEN] Checking recipient token account...");
        await getAccount(this.connection, toTokenAccount);
        console.log("[TOKEN] Recipient account exists");
      } catch (error) {
        console.log("[TOKEN] Recipient account doesn't exist, creating...");
        // Create recipient token account if it doesn't exist
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey,
            toTokenAccount,
            toPublicKey,
            SKR_MINT
          )
        );
        console.log("[TOKEN] Created ATA instruction added");
      }

      // Add transfer instruction
      const transferAmount = BigInt(amount * Math.pow(10, DECIMALS));
      console.log("[TOKEN] Transfer amount (raw):", transferAmount.toString());
      
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount
        )
      );
      console.log("[TOKEN] Transfer instruction added");

      // Set recent blockhash and fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      console.log("[TOKEN] Blockhash:", blockhash);
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      console.log("[TOKEN] Transaction built successfully");
      console.log("[TOKEN] Transaction instructions:", transaction.instructions.length);
      
      return transaction;
    } catch (error) {
      console.error("[TOKEN] Failed to build transfer transaction:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to build transfer transaction"
      );
    }
  }

  async confirmTransaction(signature: string): Promise<void> {
    try {
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log("SKR transfer successful:", signature);
    } catch (error) {
      console.error("Failed to confirm transaction:", error);
      throw new Error("Transaction failed to confirm");
    }
  }

  async hasSufficientBalance(
    walletAddress: string,
    requiredAmount: number
  ): Promise<boolean> {
    const balance = await this.getSKRBalance(walletAddress);
    return balance.uiAmount >= requiredAmount;
  }
}

export const tokenService = new TokenService();
export { SKR_MINT, DECIMALS };
