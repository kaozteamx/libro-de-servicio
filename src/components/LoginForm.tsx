import { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, User, Loader2 } from 'lucide-react';

export default function LoginForm({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: username,
        p_password: password
      });

      if (error) throw error;

      if (data) {
        onLogin(data);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err: any) {
      console.error(err);
      setError('Ocurrió un error al intentar iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="icon-container-auth">
            <Lock strokeWidth={2} />
          </div>
          <h2>Iniciar Sesión</h2>
          <p>Libro de Servicio</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Usuario</label>
            <div className="input-with-icon">
              <User size={18} />
              <input 
                type="text" 
                className="form-control"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Contraseña</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input 
                type="password" 
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-block btn-dark" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
