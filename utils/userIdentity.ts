const USER_ID_KEY = 'eac_user_id';
const USER_NAME_KEY = 'eac_user_name';
const USER_PROFILES_KEY = 'eac_user_profiles';

const fallbackUuid = () =>
  `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

interface UserProfile {
  id: string;
  name: string;
}

type UserProfiles = Record<string, UserProfile>;

const normalizeNameKey = (name: string) => name.trim().toLowerCase();

const readProfiles = (): UserProfiles => {
  const raw = localStorage.getItem(USER_PROFILES_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as UserProfiles;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const writeProfiles = (profiles: UserProfiles) => {
  localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
};

export const getOrCreateUserId = (): string => {
  const existing = localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;

  const generated = globalThis.crypto?.randomUUID?.() || fallbackUuid();
  localStorage.setItem(USER_ID_KEY, generated);
  return generated;
};

export const getOrCreateUserIdForName = (name: string): string => {
  const normalizedName = name.trim();
  if (!normalizedName) return getOrCreateUserId();

  const nameKey = normalizeNameKey(normalizedName);
  const profiles = readProfiles();
  const profile = profiles[nameKey];

  if (profile && profile.id) {
    localStorage.setItem(USER_ID_KEY, profile.id);
    localStorage.setItem(USER_NAME_KEY, profile.name || normalizedName);
    return profile.id;
  }

  const currentId = localStorage.getItem(USER_ID_KEY);
  const currentName = (localStorage.getItem(USER_NAME_KEY) || '').trim();
  const shouldReuseCurrentIdentity = !!currentId && normalizeNameKey(currentName) === nameKey;
  const userId = shouldReuseCurrentIdentity ? currentId! : (globalThis.crypto?.randomUUID?.() || fallbackUuid());

  profiles[nameKey] = {
    id: userId,
    name: normalizedName,
  };
  writeProfiles(profiles);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_NAME_KEY, normalizedName);

  return userId;
};

export const getStoredUserName = (): string => {
  return localStorage.getItem(USER_NAME_KEY) || '';
};

export const saveUserName = (name: string) => {
  const normalizedName = name.trim();
  localStorage.setItem(USER_NAME_KEY, normalizedName);
  if (!normalizedName) return;

  const userId = getOrCreateUserId();
  const profiles = readProfiles();
  profiles[normalizeNameKey(normalizedName)] = { id: userId, name: normalizedName };
  writeProfiles(profiles);
};
