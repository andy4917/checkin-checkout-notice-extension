export const OTA_REQUEST_MIN_INTERVAL_MS = 2_000;
export const OTA_REQUEST_CACHE_TTL_MS = 30_000;

export class OtaRequestThrottledError extends Error {
  constructor(message = "같은 OTA 예약 API는 잠시 후 다시 호출해주세요.") {
    super(message);
    this.name = "OtaRequestThrottledError";
  }
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type OtaRequestGuardOptions = {
  minIntervalMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
};

export function createOtaRequestGuard(options: OtaRequestGuardOptions = {}) {
  const minIntervalMs = options.minIntervalMs ?? OTA_REQUEST_MIN_INTERVAL_MS;
  const cacheTtlMs = options.cacheTtlMs ?? OTA_REQUEST_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  const inFlight = new Map<string, Promise<unknown>>();
  const cache = new Map<string, CacheEntry<unknown>>();
  const lastStartedAt = new Map<string, number>();

  return {
    async run<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
      const currentTime = now();
      const cached = cache.get(key);
      if (cached && cached.expiresAt > currentTime) {
        return cached.value as T;
      }

      const existing = inFlight.get(key);
      if (existing) return existing as Promise<T>;

      const lastStarted = lastStartedAt.get(key);
      if (lastStarted != null && currentTime - lastStarted < minIntervalMs) {
        throw new OtaRequestThrottledError();
      }

      lastStartedAt.set(key, currentTime);
      const request = fetcher().then((value) => {
        cache.set(key, {
          value,
          expiresAt: now() + cacheTtlMs,
        });
        return value;
      });

      inFlight.set(key, request);
      try {
        return await request;
      } finally {
        inFlight.delete(key);
      }
    },
    clear() {
      inFlight.clear();
      cache.clear();
      lastStartedAt.clear();
    },
  };
}

export const otaPayloadRequestGuard = createOtaRequestGuard();
