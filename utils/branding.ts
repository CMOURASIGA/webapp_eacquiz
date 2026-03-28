const DEFAULT_LOGO_URL = 'https://i.imgur.com/c5XQ7TW.png';
const DEFAULT_LOGO_FALLBACK_URL = 'https://i.imgur.com/Uo2eG7x.png';
const DEFAULT_BRAND_TEXT_PRIMARY = 'EAC';
const DEFAULT_BRAND_TEXT_HIGHLIGHT = 'Quiz';

const readEnv = (key: string): string => {
  const value = (import.meta as any).env?.[key];
  if (!value) return '';
  return String(value).trim();
};

export const APP_LOGO_URL = readEnv('NEXT_PUBLIC_LOGO_URL') || DEFAULT_LOGO_URL;
export const APP_LOGO_FALLBACK_URL = readEnv('NEXT_PUBLIC_LOGO_FALLBACK_URL') || DEFAULT_LOGO_FALLBACK_URL;
export const APP_BRAND_TEXT_PRIMARY = readEnv('NEXT_PUBLIC_BRAND_TEXT_PRIMARY') || DEFAULT_BRAND_TEXT_PRIMARY;
export const APP_BRAND_TEXT_HIGHLIGHT = readEnv('NEXT_PUBLIC_BRAND_TEXT_HIGHLIGHT') || DEFAULT_BRAND_TEXT_HIGHLIGHT;
export const APP_BRAND_TITLE = `${APP_BRAND_TEXT_PRIMARY} ${APP_BRAND_TEXT_HIGHLIGHT}`.trim();
