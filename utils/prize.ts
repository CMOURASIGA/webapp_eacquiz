export const normalizePrizeImageUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  const pageImgurMatch = withProtocol.match(/^https?:\/\/(?:www\.)?imgur\.com\/([A-Za-z0-9]+)(?:[/?#].*)?$/i);
  if (pageImgurMatch) {
    return `https://i.imgur.com/${pageImgurMatch[1]}.jpg`;
  }

  return withProtocol;
};

export const isLikelyImageUrl = (url: string): boolean => {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;

  if (/i\.imgur\.com\//i.test(url)) return true;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);
};
