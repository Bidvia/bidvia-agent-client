export type BidviaBaseUrlProfile = 'global' | 'china';

export type BidviaEnvironmentMode = 'local' | 'sim' | 'production';

const LOCAL_DEVELOPMENT_FALLBACK_BASE_URL = 'http://127.0.0.1:8787';
const LOCAL_BASE_URLS = new Set([
  LOCAL_DEVELOPMENT_FALLBACK_BASE_URL,
  'http://localhost:8787',
]);
const PRODUCTION_BASE_URLS = new Set([
  'https://bidvia.ai',
  'https://bidvia.cn',
]);

export interface ResolveBidviaBaseUrlOptions {
  profile?: BidviaBaseUrlProfile;
  explicitBaseUrl?: string;
}

export function resolveBidviaBaseUrl(options: ResolveBidviaBaseUrlOptions = {}): string {
  if (options.explicitBaseUrl) {
    return options.explicitBaseUrl;
  }

  switch (options.profile) {
    case 'global':
      return 'https://bidvia.ai';
    case 'china':
      return 'https://bidvia.cn';
    default:
      return LOCAL_DEVELOPMENT_FALLBACK_BASE_URL;
  }
}

export function resolveBidviaEnvironmentMode(options: ResolveBidviaBaseUrlOptions = {}): BidviaEnvironmentMode {
  if (options.explicitBaseUrl) {
    if (LOCAL_BASE_URLS.has(options.explicitBaseUrl)) {
      return 'local';
    }

    if (PRODUCTION_BASE_URLS.has(options.explicitBaseUrl)) {
      return 'production';
    }

    return 'sim';
  }

  if (options.profile === 'global' || options.profile === 'china') {
    return 'production';
  }

  return 'local';
}

export function resolveBidviaBaseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const profile = env.BIDVIA_BASE_URL_PROFILE === 'global' || env.BIDVIA_BASE_URL_PROFILE === 'china'
    ? env.BIDVIA_BASE_URL_PROFILE
    : undefined;
  return resolveBidviaBaseUrl({
    explicitBaseUrl: env.BIDVIA_BASE_URL,
    profile,
  });
}

export function resolveBidviaEnvironmentModeFromEnv(env: NodeJS.ProcessEnv = process.env): BidviaEnvironmentMode {
  const profile = env.BIDVIA_BASE_URL_PROFILE === 'global' || env.BIDVIA_BASE_URL_PROFILE === 'china'
    ? env.BIDVIA_BASE_URL_PROFILE
    : undefined;

  return resolveBidviaEnvironmentMode({
    explicitBaseUrl: env.BIDVIA_BASE_URL,
    profile,
  });
}
