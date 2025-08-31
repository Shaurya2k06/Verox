// Etherscan API service for real wallet data
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

export interface EtherscanBalance {
  eth: string;
  usd: string;
}

export interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  blockNumber: string;
}

export class EtherscanService {
  /**
   * Get ETH balance for an address
   */
  static async getBalance(address: string): Promise<EtherscanBalance> {
    try {
      const response = await fetch(
        `${ETHERSCAN_BASE_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === '1') {
        const weiBalance = data.result;
        const ethBalance = (parseInt(weiBalance) / 1e18).toFixed(6);
        
        // Get ETH price for USD conversion
        const priceResponse = await fetch(
          `${ETHERSCAN_BASE_URL}?module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`
        );
        const priceData = await priceResponse.json();
        
        let usdValue = '0.00';
        if (priceData.status === '1') {
          const ethPrice = parseFloat(priceData.result.ethusd);
          usdValue = (parseFloat(ethBalance) * ethPrice).toFixed(2);
        }
        
        return {
          eth: ethBalance,
          usd: usdValue
        };
      }
      
      throw new Error('Failed to fetch balance');
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Return fallback data
      return {
        eth: '0.000000',
        usd: '0.00'
      };
    }
  }

  /**
   * Get recent transactions for an address
   */
  static async getTransactions(address: string, limit: number = 10): Promise<EtherscanTransaction[]> {
    try {
      const response = await fetch(
        `${ETHERSCAN_BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === '1' && Array.isArray(data.result)) {
        return data.result.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: (parseInt(tx.value) / 1e18).toFixed(6),
          timeStamp: tx.timeStamp,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          isError: tx.isError,
          blockNumber: tx.blockNumber
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Get current ETH price in USD
   */
  static async getEthPrice(): Promise<number> {
    try {
      const response = await fetch(
        `${ETHERSCAN_BASE_URL}?module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === '1') {
        return parseFloat(data.result.ethusd);
      }
      
      return 0;
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      return 0;
    }
  }

  /**
   * Get gas price estimation
   */
  static async getGasPrice(): Promise<string> {
    try {
      const response = await fetch(
        `${ETHERSCAN_BASE_URL}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === '1') {
        return data.result.SafeGasPrice + ' gwei';
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error fetching gas price:', error);
      return 'N/A';
    }
  }
}
