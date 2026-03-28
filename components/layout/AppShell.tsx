
import React, { useEffect } from 'react';
import { Header } from './Header';
import { APP_BRAND_TITLE } from '../../utils/branding';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    document.title = APP_BRAND_TITLE;
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <Header />
      <main className="max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
};
