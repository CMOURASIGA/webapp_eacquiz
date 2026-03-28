const DEFAULT_LOGO_URL = 'https://i.imgur.com/c5XQ7TW.png';
const DEFAULT_LOGO_FALLBACK_URL = 'https://i.imgur.com/Uo2eG7x.png';

const readEnv = (key: string): string => {
  const value = (import.meta as any).env?.[key];
  if (!value) return '';
  return String(value).trim();
};

export const APP_LOGO_URL = readEnv('NEXT_PUBLIC_LOGO_URL') || DEFAULT_LOGO_URL;
export const APP_LOGO_FALLBACK_URL = readEnv('NEXT_PUBLIC_LOGO_FALLBACK_URL') || DEFAULT_LOGO_FALLBACK_URL;
