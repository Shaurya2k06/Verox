// Native messaging service for communicating with Verox native host
export interface NativeMessage {
  action: string;
  data?: any;
}

export interface NativeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  private_key?: string;
}

export interface TransactionData {
  to: string;
  amount: string;
  gas_price?: string;
}

export interface BiometricResult {
  verified: boolean;
  method: string;
}

class VeroxNativeService {
  private port: chrome.runtime.Port | null = null;

  constructor() {
    this.initializePort();
  }

  private initializePort() {
    try {
      // Connect to the native messaging host
      this.port = chrome.runtime.connectNative('com.verox.native_host');
      
      this.port.onMessage.addListener((response: NativeResponse) => {
        console.log('Received from native host:', response);
      });

      this.port.onDisconnect.addListener(() => {
        console.log('Native host disconnected');
        this.port = null;
      });
    } catch (error) {
      console.error('Failed to connect to native host:', error);
    }
  }

  private async sendMessage(message: NativeMessage): Promise<NativeResponse> {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        this.initializePort();
      }

      if (!this.port) {
        reject(new Error('Failed to connect to native host'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Native host timeout'));
      }, 5000);

      const messageHandler = (response: NativeResponse) => {
        clearTimeout(timeout);
        this.port?.onMessage.removeListener(messageHandler);
        resolve(response);
      };

      this.port.onMessage.addListener(messageHandler);
      this.port.postMessage(message);
    });
  }

  async createWallet(): Promise<WalletInfo> {
    try {
      const response = await this.sendMessage({ action: 'create_wallet' });
      
      if (response.success && response.data) {
        return {
          address: response.data.address,
          balance: '0.0',
          private_key: response.data.private_key
        };
      } else {
        throw new Error(response.error || 'Failed to create wallet');
      }
    } catch (error) {
      console.error('Create wallet error:', error);
      throw error;
    }
  }

  async unlockWallet(): Promise<WalletInfo> {
    try {
      const response = await this.sendMessage({ action: 'unlock_wallet' });
      
      if (response.success && response.data) {
        return {
          address: response.data.address,
          balance: response.data.balance || '0.0'
        };
      } else {
        throw new Error(response.error || 'Failed to unlock wallet');
      }
    } catch (error) {
      console.error('Unlock wallet error:', error);
      throw error;
    }
  }

  async verifyBiometric(): Promise<BiometricResult> {
    try {
      const response = await this.sendMessage({ action: 'verify_biometric' });
      
      if (response.success && response.data) {
        return {
          verified: response.data.verified,
          method: response.data.method
        };
      } else {
        throw new Error(response.error || 'Biometric verification failed');
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      throw error;
    }
  }

  async registerBiometric(): Promise<boolean> {
    try {
      const response = await this.sendMessage({ action: 'register_biometric' });
      return response.success;
    } catch (error) {
      console.error('Register biometric error:', error);
      return false;
    }
  }

  async getWalletInfo(): Promise<WalletInfo> {
    try {
      const response = await this.sendMessage({ action: 'get_wallet_info' });
      
      if (response.success && response.data) {
        return {
          address: response.data.address,
          balance: response.data.balance
        };
      } else {
        throw new Error(response.error || 'Failed to get wallet info');
      }
    } catch (error) {
      console.error('Get wallet info error:', error);
      throw error;
    }
  }

  async sendTransaction(transactionData: TransactionData): Promise<string> {
    try {
      const response = await this.sendMessage({ 
        action: 'send_transaction',
        data: transactionData
      });
      
      if (response.success && response.data) {
        return response.data.tx_hash;
      } else {
        throw new Error(response.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    }
  }

  // Fallback methods for when native host is not available
  async createWalletFallback(): Promise<WalletInfo> {
    // Generate a wallet using Web Crypto API as fallback
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const privateKey = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // This is a simplified address generation - in production you'd use proper crypto
    const addressBytes = new Uint8Array(20);
    crypto.getRandomValues(addressBytes);
    const address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      address,
      balance: '0.0',
      private_key: '0x' + privateKey
    };
  }

  async verifyBiometricFallback(): Promise<BiometricResult> {
    // Use WebAuthn API as fallback
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported');
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No biometric authenticator available');
      }

      // Create a simple authentication challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Verox Wallet',
            id: 'localhost'
          },
          user: {
            id: new TextEncoder().encode('verox-user'),
            name: 'Verox User',
            displayName: 'Verox User'
          },
          pubKeyCredParams: [{
            alg: -7,
            type: 'public-key'
          }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      });

      return {
        verified: !!credential,
        method: 'WebAuthn'
      };
    } catch (error) {
      console.error('WebAuthn fallback error:', error);
      throw error;
    }
  }
}

export const veroxNative = new VeroxNativeService();
