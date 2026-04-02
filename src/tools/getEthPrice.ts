import { Injectable } from '@nestjs/common';
import type { ToolDefinition, ToolService } from './tool.interface';

// 60-second in-memory cache — prevents CoinGecko rate limit (30 calls/min)
let priceCache: {
  usd: number;
  eur: number;
  usd_24h_change: number | null;
  cachedAt: number;
} | null = null;
const CACHE_TTL = 60_000;

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur&include_24hr_change=true';

@Injectable()
export class GetEthPriceService implements ToolService {
  readonly definition: ToolDefinition = {
    name: 'get_eth_price',
    description:
      'Fetches the current ETH price in USD and EUR from CoinGecko. Use this to convert ETH amounts to fiat values.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  async execute(): Promise<string> {
    try {
      const now = Date.now();

      // Return cached price if still fresh
      if (priceCache && now - priceCache.cachedAt < CACHE_TTL) {
        return JSON.stringify({
          eth_usd: `$${priceCache.usd.toLocaleString()}`,
          eth_eur: `€${priceCache.eur.toLocaleString()}`,
          change_24h: priceCache.usd_24h_change
            ? `${priceCache.usd_24h_change.toFixed(2)}%`
            : 'N/A',
          cached: true,
        });
      }

      const response = await fetch(COINGECKO_URL);

      if (!response.ok) {
        return JSON.stringify({
          error: 'CoinGecko API unavailable',
          message: 'Unable to fetch ETH price right now. Try again shortly.',
        });
      }

      const data = await response.json();
      const eth = data.ethereum;

      priceCache = {
        usd: eth.usd,
        eur: eth.eur,
        usd_24h_change: eth.usd_24h_change ?? null,
        cachedAt: now,
      };

      return JSON.stringify({
        eth_usd: `$${eth.usd.toLocaleString()}`,
        eth_eur: `€${eth.eur.toLocaleString()}`,
        change_24h: eth.usd_24h_change
          ? `${eth.usd_24h_change.toFixed(2)}%`
          : 'N/A',
        cached: false,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error fetching ETH price: ${msg}`;
    }
  }
}
