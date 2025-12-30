
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './store/gameStore';
import { AppShell } from './components/layout/AppShell';

import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { HostQuizSelectPage } from './pages/HostQuizSelectPage';
import { HostGamePage } from './pages/HostGamePage';
import { PlayerJoinPage } from './pages/PlayerJoinPage';
import { PlayerGamePage } from './pages/PlayerGamePage';

const App: React.FC = () => {
  return (
    <GameProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/host/quizzes" element={<HostQuizSelectPage />} />
            <Route path="/host/game/:pin" element={<HostGamePage />} />
            <Route path="/player/join" element={<PlayerJoinPage />} />
            <Route path="/player/game/:pin" element={<PlayerGamePage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </GameProvider>
  );
};

export default App;
