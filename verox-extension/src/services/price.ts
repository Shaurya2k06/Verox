// Real cryptocurrency price service using Pyth Network
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

export interface PricePoint {
  timestamp: number;
  price: number;
}

class PriceService {
  private cachedPrices: CryptoPrices | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  // Pyth Price IDs
  private readonly PRICE_IDS = {
    ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    USDC: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'
  };

  // Pyth Benchmarks Symbols
  private readonly BENCHMARK_SYMBOLS = {
    ETH: 'Crypto.ETH/USD',
    BTC: 'Crypto.BTC/USD',
    USDC: 'Crypto.USDC/USD'
  };

  async getCurrentPrices(): Promise<CryptoPrices> {
    const now = Date.now();

    // Return cached prices if they're still fresh
    if (this.cachedPrices && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedPrices;
    }

    try {
      // Using Pyth Hermes API
      const url = new URL('https://hermes.pyth.network/v2/updates/price/latest');
      Object.values(this.PRICE_IDS).forEach(id => {
        url.searchParams.append('ids[]', id);
      });

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch prices from Pyth');
      }

      const data = await response.json();
      const prices: any = {};

      // Parse Pyth response
      if (data.parsed) {
        data.parsed.forEach((item: any) => {
          const price = this.parsePythPrice(item.price.price, item.price.expo);

          if (item.id === this.PRICE_IDS.ETH) prices.ETH = price;
          if (item.id === this.PRICE_IDS.BTC) prices.BTC = price;
          if (item.id === this.PRICE_IDS.USDC) prices.USDC = price;
        });
      }

      this.cachedPrices = {
        ETH: prices.ETH || 2000,
        BTC: prices.BTC || 40000,
        USDC: prices.USDC || 1
      };

      this.lastFetch = now;
      return this.cachedPrices;

    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);

      // Return fallback prices if API fails
      return this.cachedPrices || {
        ETH: 2000,
        BTC: 40000,
        USDC: 1
      };
    }
  }

  private parsePythPrice(priceStr: string, expo: number): number {
    const price = parseFloat(priceStr);
    return price * Math.pow(10, expo);
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
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  async getHistoricalPrices(symbol: 'ETH' | 'BTC' | 'USDC', range: '1D' | '1W' | '1M' = '1D'): Promise<PricePoint[]> {
    try {
      const pythSymbol = this.BENCHMARK_SYMBOLS[symbol];
      const to = Math.floor(Date.now() / 1000);
      let from = to;
      let resolution = '60';

      switch (range) {
        case '1D':
          from = to - 24 * 60 * 60;
          resolution = '15'; // 15 min candles
          break;
        case '1W':
          from = to - 7 * 24 * 60 * 60;
          resolution = '60'; // 1 hour candles
          break;
        case '1M':
          from = to - 30 * 24 * 60 * 60;
          resolution = '240'; // 4 hour candles
          break;
      }

      const url = `https://benchmarks.pyth.network/v1/shim/tradingview/history?symbol=${pythSymbol}&resolution=${resolution}&from=${from}&to=${to}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch historical data');

      const data = await response.json();

      if (data.s === 'ok' && data.t && data.c) {
        return data.t.map((timestamp: number, index: number) => ({
          timestamp: timestamp * 1000,
          price: data.c[index]
        }));
      }

      throw new Error('Invalid data format');
    } catch (error) {
      console.warn('Error fetching historical prices:', error);
      return [];
    }
  }
}

export const priceService = new PriceService();
