import { ethers } from 'ethers';

// Wallet service that connects to real blockchain (Sepolia Testnet)
export interface WalletServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
}

export interface TransactionResult {
  txHash: string;
  status: string;
}

export interface BiometricResult {
  verified: boolean;
  method: string;
}

export interface Transaction {
  hash: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

class WalletService {
  private readonly STORAGE_KEYS = {
    ADDRESS: 'verox_wallet_address',
    MNEMONIC: 'verox_wallet_mnemonic', // Storing mnemonic locally for demo purposes
    TRANSACTIONS: 'verox_transactions'
  };

  // Sepolia Testnet RPC
  private readonly RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
  }

  // Helper to get wallet instance from storage
  private async getWalletInstance(): Promise<ethers.HDNodeWallet | ethers.Wallet | null> {
    const mnemonic = localStorage.getItem(this.STORAGE_KEYS.MNEMONIC);
    if (!mnemonic) return null;
    try {
      return ethers.Wallet.fromPhrase(mnemonic, this.provider);
    } catch (error) {
      console.error('Failed to load wallet from mnemonic:', error);
      return null;
    }
  }

  async createWalletFromMnemonic(mnemonic: string): Promise<WalletServiceResult<WalletInfo>> {
    try {
      // Validate mnemonic by attempting to create a wallet
      const wallet = ethers.Wallet.fromPhrase(mnemonic, this.provider);

      // Get real balance
      const balanceBigInt = await this.provider.getBalance(wallet.address);
      const balance = ethers.formatEther(balanceBigInt);

      // Store data
      localStorage.setItem(this.STORAGE_KEYS.ADDRESS, wallet.address);
      localStorage.setItem(this.STORAGE_KEYS.MNEMONIC, mnemonic);

      // Initialize empty transactions if not present
      if (!localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS)) {
        localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      }

      return {
        success: true,
        data: {
          address: wallet.address,
          balance
        }
      };
    } catch (error) {
      console.error('Error creating wallet from mnemonic:', error);
      return { success: false, error: 'Invalid recovery phrase' };
    }
  }

  async createWallet(): Promise<WalletServiceResult<WalletInfo & { mnemonic: string }>> {
    try {
      const wallet = ethers.Wallet.createRandom(this.provider);
      const mnemonic = wallet.mnemonic!.phrase;

      // New wallets have 0 balance
      const balance = '0.0';

      localStorage.setItem(this.STORAGE_KEYS.ADDRESS, wallet.address);
      localStorage.setItem(this.STORAGE_KEYS.MNEMONIC, mnemonic);
      localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));

      return {
        success: true,
        data: {
          address: wallet.address,
          balance,
          mnemonic
        }
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return { success: false, error: 'Failed to create wallet' };
    }
  }

  async unlockWallet(): Promise<WalletServiceResult<WalletInfo>> {
    const wallet = await this.getWalletInstance();

    if (wallet) {
      try {
        // Fetch real balance
        const balanceBigInt = await this.provider.getBalance(wallet.address);
        const balance = ethers.formatEther(balanceBigInt);

        return {
          success: true,
          data: {
            address: wallet.address,
            balance
          }
        };
      } catch (error) {
        console.error('Error fetching balance:', error);
        // Return stored address with 0 balance if network fails, or handle error
        return {
          success: true,
          data: {
            address: wallet.address,
            balance: '0.0' // Could fallback to cached balance if we stored it
          }
        };
      }
    }

    return {
      success: false,
      error: 'No wallet found'
    };
  }

  async sendTransaction(to: string, amount: string): Promise<WalletServiceResult<TransactionResult>> {
    const wallet = await this.getWalletInstance();

    if (!wallet) {
      return { success: false, error: 'Wallet not initialized' };
    }

    try {
      const tx = await wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });

      // We return the hash immediately, but in a real app we might wait for confirmation
      // or let the UI poll for it.

      await this.saveTransaction(tx.hash, to, amount);

      return {
        success: true,
        data: {
          txHash: tx.hash,
          status: 'pending' // It's pending until mined
        }
      };
    } catch (error: any) {
      console.error('Transaction error:', error);
      // Extract useful error message if possible
      const msg = error.reason || error.message || 'Transaction failed';
      return { success: false, error: msg };
    }
  }

  async getStoredWallet(): Promise<string | null> {
    return localStorage.getItem(this.STORAGE_KEYS.ADDRESS);
  }

  async saveTransaction(txHash: string, to: string, amount: string): Promise<void> {
    const transactions = await this.getStoredTransactions();
    const newTx: Transaction = {
      hash: txHash,
      to,
      amount,
      timestamp: Date.now(),
      status: 'pending'
    };

    transactions.unshift(newTx);

    // Keep only last 50 transactions
    const limitedTransactions = transactions.slice(0, 50);

    localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(limitedTransactions));
  }

  async getStoredTransactions(): Promise<Transaction[]> {
    const stored = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  }

  async resetWallet(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEYS.ADDRESS);
    localStorage.removeItem(this.STORAGE_KEYS.MNEMONIC);
    localStorage.removeItem(this.STORAGE_KEYS.TRANSACTIONS);
  }
}

export const walletService = new WalletService();
