const ADMIN_SESSION_KEY = 'eac_admin_session';

const getEnvAdminUser = () =>
  (import.meta as any).env?.NEXT_PUBLIC_ADMIN_USER || 'admin';

const getEnvAdminPass = () =>
  (import.meta as any).env?.NEXT_PUBLIC_ADMIN_PASS || 'admin123';

const hasLocalStorage = () =>
  typeof window !== 'undefined' && !!window.localStorage;

export const isAdminAuthenticated = (): boolean => {
  if (!hasLocalStorage()) return false;
  return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
};

export const loginAdmin = (username: string, password: string): boolean => {
  const normalizedUser = username.trim();
  const normalizedPass = password.trim();

  if (normalizedUser !== getEnvAdminUser()) return false;
  if (normalizedPass !== getEnvAdminPass()) return false;

  if (hasLocalStorage()) {
    localStorage.setItem(ADMIN_SESSION_KEY, '1');
  }
  return true;
};

export const logoutAdmin = () => {
  if (!hasLocalStorage()) return;
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

