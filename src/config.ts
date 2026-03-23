export type BidviaBaseUrlProfile = 'global' | 'china';

const LOCAL_DEVELOPMENT_FALLBACK_BASE_URL = 'http://127.0.0.1:8787';

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

export function resolveBidviaBaseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const profile = env.BIDVIA_BASE_URL_PROFILE === 'global' || env.BIDVIA_BASE_URL_PROFILE === 'china'
    ? env.BIDVIA_BASE_URL_PROFILE
    : undefined;
  return resolveBidviaBaseUrl({
    explicitBaseUrl: env.BIDVIA_BASE_URL,
    profile,
  });
}
