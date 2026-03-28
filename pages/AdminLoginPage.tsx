import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { isAdminAuthenticated, loginAdmin } from '../utils/adminAuth';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = params.get('next');
    if (!next) return '/admin';
    if (!next.startsWith('/')) return '/admin';
    return next;
  }, [location.search]);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const ok = loginAdmin(username, password);
    if (!ok) {
      setError('Usuário ou senha de admin inválidos.');
      return;
    }

    navigate(nextPath, { replace: true });
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-center">Acesso Admin</h2>
        <p className="text-white/60 mb-6 text-center text-sm">
          Área restrita para criar sala ao vivo e configurar integração.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center font-medium bg-red-500/10 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/')}>
              Voltar
            </Button>
            <Button type="submit" fullWidth>
              Entrar como Admin
            </Button>
          </div>
        </form>

        <p className="text-xs text-white/50 mt-6">
          Credenciais padrão: admin/admin123. Para produção, defina NEXT_PUBLIC_ADMIN_USER e NEXT_PUBLIC_ADMIN_PASS.
        </p>
      </Card>
    </div>
  );
};
