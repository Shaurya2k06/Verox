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
  tokenSymbol?: string; // Added for token support
}

// Minimal ERC-20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

class WalletService {
  private readonly STORAGE_KEYS = {
    ENCRYPTED_WALLET: 'verox_encrypted_wallet',
    TRANSACTIONS: 'verox_transactions',
    NETWORKS: 'verox_networks' // For future network support
  };

  // Sepolia Testnet RPC
  private readonly RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
  private provider: ethers.JsonRpcProvider;
  private walletInstance: ethers.HDNodeWallet | ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
  }



  async hasWallet(): Promise<boolean> {
    return !!localStorage.getItem(this.STORAGE_KEYS.ENCRYPTED_WALLET);
  }

  async getBalance(address: string): Promise<string> {
    try {
      const balanceBigInt = await this.provider.getBalance(address);
      return ethers.formatEther(balanceBigInt);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0.0';
    }
  }

  async unlockWalletWithPassword(password: string): Promise<WalletServiceResult<WalletInfo>> {
    const encryptedJson = localStorage.getItem(this.STORAGE_KEYS.ENCRYPTED_WALLET);
    if (!encryptedJson) {
      return { success: false, error: 'No wallet found' };
    }

    try {
      // Decrypt the wallet
      const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
      this.walletInstance = wallet.connect(this.provider);

      const balanceBigInt = await this.provider.getBalance(this.walletInstance.address);
      const balance = ethers.formatEther(balanceBigInt);

      return {
        success: true,
        data: {
          address: this.walletInstance.address,
          balance
        }
      };
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      return { success: false, error: 'Incorrect password' };
    }
  }

  async createWalletFromMnemonic(mnemonic: string, password: string): Promise<WalletServiceResult<WalletInfo>> {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic, this.provider);

      // Encrypt wallet
      const encryptedJson = await wallet.encrypt(password);
      localStorage.setItem(this.STORAGE_KEYS.ENCRYPTED_WALLET, encryptedJson);

      // Initialize instance
      this.walletInstance = wallet;

      const balanceBigInt = await this.provider.getBalance(wallet.address);
      const balance = ethers.formatEther(balanceBigInt);

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
      return { success: false, error: 'Invalid recovery phrase or encryption failed' };
    }
  }

  async createWallet(password: string): Promise<WalletServiceResult<WalletInfo & { mnemonic: string }>> {
    try {
      const wallet = ethers.Wallet.createRandom(this.provider);
      const mnemonic = wallet.mnemonic!.phrase;

      // Encrypt wallet
      const encryptedJson = await wallet.encrypt(password);
      localStorage.setItem(this.STORAGE_KEYS.ENCRYPTED_WALLET, encryptedJson);

      // Initialize instance
      this.walletInstance = wallet;

      const balance = '0.0';
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

  // Removed old unlockWallet as it relied on insecure storage
  // Replaced with unlockWalletWithPassword

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return '0.0';
    }
  }

  async sendTransaction(to: string, amount: string): Promise<WalletServiceResult<TransactionResult>> {
    if (!this.walletInstance) {
      return { success: false, error: 'Wallet not unlocked' };
    }

    try {
      const tx = await this.walletInstance.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });

      await this.saveTransaction(tx.hash, to, amount, 'ETH');

      return {
        success: true,
        data: {
          txHash: tx.hash,
          status: 'pending'
        }
      };
    } catch (error: any) {
      console.error('Transaction error:', error);
      const msg = error.reason || error.message || 'Transaction failed';
      return { success: false, error: msg };
    }
  }

  async sendToken(tokenAddress: string, to: string, amount: string): Promise<WalletServiceResult<TransactionResult>> {
    if (!this.walletInstance) {
      return { success: false, error: 'Wallet not unlocked' };
    }

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.walletInstance);
      const decimals = await contract.decimals();
      const symbol = await contract.symbol();

      const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals));

      await this.saveTransaction(tx.hash, to, amount, symbol);

      return {
        success: true,
        data: {
          txHash: tx.hash,
          status: 'pending'
        }
      };
    } catch (error: any) {
      console.error('Token transaction error:', error);
      const msg = error.reason || error.message || 'Token transaction failed';
      return { success: false, error: msg };
    }
  }

  async getStoredWallet(): Promise<string | null> {
    // This is now just a check if a wallet exists, but doesn't return address without unlock
    // We can return a dummy value or null to trigger unlock flow
    const exists = await this.hasWallet();
    return exists ? 'LOCKED' : null;
  }

  async saveTransaction(txHash: string, to: string, amount: string, tokenSymbol: string = 'ETH'): Promise<void> {
    const transactions = await this.getStoredTransactions();
    const newTx: Transaction = {
      hash: txHash,
      to,
      amount,
      timestamp: Date.now(),
      status: 'pending',
      tokenSymbol
    };

    transactions.unshift(newTx);
    const limitedTransactions = transactions.slice(0, 50);
    localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(limitedTransactions));
  }

  async getStoredTransactions(): Promise<Transaction[]> {
    const stored = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  }

  async resetWallet(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEYS.ENCRYPTED_WALLET);
    localStorage.removeItem(this.STORAGE_KEYS.TRANSACTIONS);
    this.walletInstance = null;
  }
}

export const walletService = new WalletService();
