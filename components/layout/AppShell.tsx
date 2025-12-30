
import React from 'react';
import { Header } from './Header';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <Header />
      <main className="max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
};
