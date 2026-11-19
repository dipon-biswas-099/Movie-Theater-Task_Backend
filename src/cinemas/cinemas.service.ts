import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Cinema } from './cinema.entity.js';
import { CreateCinemaDto } from './cinema.dto.js';

export interface BookingQuoteResult {
  possible: boolean;
  totalBundles?: number;
  breakdown?: Record<number, number>;
}

export { CreateCinemaDto };

@Injectable()
export class CinemasService {
  private cinemas = new Map<string, Cinema>();

  createCinema(dto: CreateCinemaDto): Cinema {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('name must not be empty');
    }
    for (const c of this.cinemas.values()) {
      if (c.name === dto.name) {
        throw new BadRequestException('Cinema name must be unique');
      }
    }

    if (!dto.bundleSizes || dto.bundleSizes.length < 1 || dto.bundleSizes.length > 10) {
      throw new BadRequestException('bundleSizes must have 1–10 entries');
    }

    for (const size of dto.bundleSizes) {
      if (!Number.isInteger(size) || size < 1 || size > 500) {
        throw new BadRequestException('Each bundle size must be an integer between 1 and 500');
      }
      if (new Set(dto.bundleSizes).size !== dto.bundleSizes.length) {
        throw new BadRequestException('bundleSizes must contain different values');
      }
    }

    const cinema: Cinema = {
      id: crypto.randomUUID(),
      name: dto.name,
      bundleSizes: dto.bundleSizes,
    };

    this.cinemas.set(cinema.id, cinema);
    return cinema;
  }

  listCinemas(): Cinema[] {
    return Array.from(this.cinemas.values());
  }

  getBookingQuote(cinemaId: string, groupSize: number): BookingQuoteResult {
    const cinema = this.cinemas.get(cinemaId);
    if (!cinema) {
      throw new NotFoundException(`Cinema not found: ${cinemaId}`);
    }

    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
      throw new BadRequestException('groupSize must be an integer between 1 and 10,000');
    }

    const sizes = cinema.bundleSizes;
    const INF = Infinity;

    // dp[amount] = minimum number of bundles to reach that amount
    const dp: number[] = Array.from({ length: groupSize + 1 }, () => INF);
    const lastUsed: number[] = Array.from({ length: groupSize + 1 }, () => -1);
    dp[0] = 0;

    for (let amount = 1; amount <= groupSize; amount++) {
      for (const size of sizes) {
        if (size <= amount && dp[amount - size] + 1 < dp[amount]) {
          dp[amount] = dp[amount - size] + 1;
          lastUsed[amount] = size;
        }
      }
    }

    if (dp[groupSize] === INF) {
      return { possible: false };
    }

    const breakdown: Record<number, number> = {};
    let remaining = groupSize;
    while (remaining > 0) {
      const size = lastUsed[remaining];
      breakdown[size] = (breakdown[size] ?? 0) + 1;
      remaining -= size;
    }

    return {
      possible: true,
      totalBundles: dp[groupSize],
      breakdown,
    };
  }
}
