// Real cryptocurrency price service
export interface CryptoPrices {
  ETH: number;
  BTC: number;
  USDC: number;
}

export interface CryptoBalances {
  ETH: string;
  BTC: string;
  USDC: string;
}

class PriceService {
  private cachedPrices: CryptoPrices | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute

  async getCurrentPrices(): Promise<CryptoPrices> {
    const now = Date.now();
    
    // Return cached prices if they're still fresh
    if (this.cachedPrices && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedPrices;
    }

    try {
      // Using CoinGecko API (free tier)
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,usd-coin&vs_currencies=usd');
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      
      this.cachedPrices = {
        ETH: data.ethereum?.usd || 2000, // fallback prices
        BTC: data.bitcoin?.usd || 40000,
        USDC: data['usd-coin']?.usd || 1
      };
      
      this.lastFetch = now;
      return this.cachedPrices;
      
    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);
      
      // Return fallback prices if API fails
      return {
        ETH: 2000,
        BTC: 40000,
        USDC: 1
      };
    }
  }

  async getPortfolioValue(balances: CryptoBalances): Promise<number> {
    const prices = await this.getCurrentPrices();
    
    const ethValue = parseFloat(balances.ETH) * prices.ETH;
    const btcValue = parseFloat(balances.BTC) * prices.BTC;
    const usdcValue = parseFloat(balances.USDC) * prices.USDC;
    
    return ethValue + btcValue + usdcValue;
  }

  formatPrice(price: number): string {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(4)}`;
    }
  }

  formatBalance(balance: string, decimals: number = 4): string {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(decimals);
  }
}

export const priceService = new PriceService();
