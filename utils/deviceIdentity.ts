const DEVICE_ID_KEY = 'eac_device_id';

const fallbackDeviceId = () =>
  `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const getOrCreateDeviceId = (): string => {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = globalThis.crypto?.randomUUID?.() || fallbackDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
};
