// Wallet service that communicates with background script
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

class WalletService {
  private async sendMessage(action: string, data?: any): Promise<WalletServiceResult<any>> {
    return new Promise((resolve) => {
      // Check if we're in a Chrome extension environment
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({
          success: false,
          error: 'Chrome extension environment not available'
        });
        return;
      }

      chrome.runtime.sendMessage({ action, data }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: 'No response received' });
        }
      });
    });
  }

  async createWallet(): Promise<WalletServiceResult<WalletInfo>> {
    return await this.sendMessage('init_wallet');
  }

  async unlockWallet(): Promise<WalletServiceResult<WalletInfo>> {
    return await this.sendMessage('unlock_wallet');
  }

  async verifyBiometric(): Promise<WalletServiceResult<BiometricResult>> {
    return await this.sendMessage('verify_biometric');
  }

  async sendTransaction(to: string, amount: string, gasPrice?: string): Promise<WalletServiceResult<TransactionResult>> {
    return await this.sendMessage('send_transaction', {
      to,
      amount,
      gasPrice
    });
  }

  async getStoredWallet(): Promise<string | null> {
    return new Promise((resolve) => {
      // Check if Chrome storage is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        resolve(null);
        return;
      }

      chrome.storage.local.get(['verox_wallet_address'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result.verox_wallet_address || null);
        }
      });
    });
  }

  async saveTransaction(txHash: string, to: string, amount: string): Promise<void> {
    const transactions = await this.getStoredTransactions();
    transactions.unshift({
      hash: txHash,
      to,
      amount,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    // Keep only last 50 transactions
    const limitedTransactions = transactions.slice(0, 50);
    
    chrome.storage.local.set({
      'verox_transactions': limitedTransactions
    });
  }

  async getStoredTransactions(): Promise<any[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['verox_transactions'], (result) => {
        resolve(result.verox_transactions || []);
      });
    });
  }
}

export const walletService = new WalletService();
