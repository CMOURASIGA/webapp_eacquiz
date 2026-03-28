
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
import { AsyncQuizPage } from './pages/AsyncQuizPage';
import { AsyncResultPage } from './pages/AsyncResultPage';
import { AsyncRankingPage } from './pages/AsyncRankingPage';
import { ModeGate } from './components/mode/ModeGate';
import { AdminGuard } from './components/auth/AdminGuard';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminResultsPanelPage } from './pages/AdminResultsPanelPage';

const App: React.FC = () => {
  return (
    <GameProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboardPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/resultados"
              element={
                <AdminGuard>
                  <AdminResultsPanelPage />
                </AdminGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminGuard>
                  <ModeGate targetMode="live">
                    <SettingsPage />
                  </ModeGate>
                </AdminGuard>
              }
            />
            <Route
              path="/host/quizzes"
              element={
                <AdminGuard>
                  <ModeGate targetMode="live">
                    <HostQuizSelectPage />
                  </ModeGate>
                </AdminGuard>
              }
            />
            <Route
              path="/host/game/:pin"
              element={
                <AdminGuard>
                  <ModeGate targetMode="live">
                    <HostGamePage />
                  </ModeGate>
                </AdminGuard>
              }
            />
            <Route path="/player/join" element={<ModeGate targetMode="live"><PlayerJoinPage /></ModeGate>} />
            <Route path="/player/game/:pin" element={<ModeGate targetMode="live"><PlayerGamePage /></ModeGate>} />
            <Route path="/quiz" element={<ModeGate targetMode="async"><AsyncQuizPage /></ModeGate>} />
            <Route path="/resultado" element={<ModeGate targetMode="async"><AsyncResultPage /></ModeGate>} />
            <Route path="/ranking" element={<ModeGate targetMode="async"><AsyncRankingPage /></ModeGate>} />
          </Routes>
        </AppShell>
      </HashRouter>
    </GameProvider>
  );
};

export default App;
