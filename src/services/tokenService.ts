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
const DECIMALS = 9; // Most SPL tokens use 9 decimals (like SOL)

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

  async transferSKR(
    fromWallet: Account,
    toAddress: string,
    amount: number,
    signAndSendTransaction: (tx: Transaction) => Promise<string>
  ): Promise<TokenTransferResult> {
    try {
      const fromPublicKey = new PublicKey(fromWallet.address);
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

      const transaction = new Transaction();

      // Check if recipient token account exists
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        // Create recipient token account if it doesn't exist
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey,
            toTokenAccount,
            toPublicKey,
            SKR_MINT
          )
        );
      }

      // Add transfer instruction
      const transferAmount = BigInt(amount * Math.pow(10, DECIMALS));
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount
        )
      );

      // Set recent blockhash and fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      // Sign and send transaction
      const signature = await signAndSendTransaction(transaction);

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, "confirmed");

      console.log("SKR transfer successful:", signature);

      return {
        signature,
        success: true,
      };
    } catch (error) {
      console.error("Failed to transfer SKR:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to transfer SKR tokens"
      );
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
