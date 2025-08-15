export interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  confirmations: string;
  isError: string;
}

export interface EtherscanBalance {
  account: string;
  balance: string;
}

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

export class EtherscanService {
  private static formatWei(wei: string): string {
    const ethValue = parseFloat(wei) / 1e18;
    return ethValue.toFixed(6);
  }

  private static formatTimestamp(timestamp: string): string {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString();
  }

  static async getBalance(address: string): Promise<{ eth: string; usd: string }> {
    try {
      // Get ETH balance
      const balanceResponse = await fetch(
        `${ETHERSCAN_BASE_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
      );
      const balanceData = await balanceResponse.json();
      
      if (balanceData.status !== '1') {
        throw new Error('Failed to fetch balance');
      }

      const ethBalance = this.formatWei(balanceData.result);

      // Get ETH price in USD
      const priceResponse = await fetch(
        `${ETHERSCAN_BASE_URL}?module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`
      );
      const priceData = await priceResponse.json();
      
      const ethPrice = priceData.status === '1' ? parseFloat(priceData.result.ethusd) : 0;
      const usdBalance = (parseFloat(ethBalance) * ethPrice).toFixed(2);

      return {
        eth: ethBalance,
        usd: usdBalance
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      return { eth: '0.000000', usd: '0.00' };
    }
  }

  static async getTransactions(address: string, limit: number = 5): Promise<Array<{
    hash: string;
    type: 'sent' | 'received';
    amount: string;
    date: string;
    status: 'success' | 'failed';
  }>> {
    try {
      const response = await fetch(
        `${ETHERSCAN_BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status !== '1') {
        return [];
      }

      return data.result.map((tx: EtherscanTransaction) => ({
        hash: tx.hash,
        type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
        amount: this.formatWei(tx.value),
        date: this.formatTimestamp(tx.timeStamp),
        status: tx.isError === '0' ? 'success' : 'failed'
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }
}