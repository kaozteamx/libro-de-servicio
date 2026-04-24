import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserPlus, KeyRound, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminPanel({ adminUser, onBack }: { adminUser: any, onBack: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelAction, setPanelAction] = useState<'list' | 'create' | 'reset'>('list');
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  // Forms state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Necesitamos la clave del admin para listar? Sí, la pedimos o mostramos algo básico si no.
      // Para listar usuarios en un entorno seguro simple:
      const { data, error } = await supabase.from('app_users').select('username, role, created_at').neq('username', 'admin');
      
      if (error) {
        console.warn('Recuerda aplicar RLS a app_users si no lo has hecho.', error);
      }
      
      if (data) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !adminPassword) return;

    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.rpc('create_new_user', {
        p_admin_user: adminUser.username,
        p_admin_pass: adminPassword,
        p_new_user: newUsername,
        p_new_pass: newPassword
      });

      if (error) throw error;

      if (data) {
        setMessage({ text: 'Usuario creado exitosamente', type: 'success' });
        setNewUsername('');
        setNewPassword('');
        setAdminPassword('');
        fetchUsers();
        setTimeout(() => setPanelAction('list'), 1500);
      } else {
        setMessage({ text: 'Error: Contraseña de administrador inválida o usuario ya existe', type: 'error' });
      }
    } catch (error: any) {
      setMessage({ text: 'Ocurrió un error inesperado', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || !adminPassword) return;

    setActionLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.rpc('reset_user_password', {
        p_admin_user: adminUser.username,
        p_admin_pass: adminPassword,
        p_target_user: selectedUser,
        p_new_pass: newPassword
      });

      if (error) throw error;

      if (data) {
        setMessage({ text: 'Contraseña reseteada exitosamente', type: 'success' });
        setNewPassword('');
        setAdminPassword('');
        setTimeout(() => setPanelAction('list'), 1500);
      } else {
        setMessage({ text: 'Error: Contraseña de administrador inválida', type: 'error' });
      }
    } catch (error: any) {
      setMessage({ text: 'Ocurrió un error inesperado', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header-actions">
        <button className="btn-icon" onClick={onBack} title="Volver al inicio">
          <ArrowLeft size={20} /> <span style={{marginLeft: '0.5rem', fontSize: '14px'}}>Volver</span>
        </button>
        <div style={{flex: 1}}></div>
        <button 
          className={`btn-outline ${panelAction === 'create' ? 'active' : ''}`} 
          onClick={() => { setPanelAction('create'); setMessage({text:'', type:''}); setAdminPassword(''); }}
        >
          <UserPlus size={16} /> Crear Usuario
        </button>
        <button 
          className={`btn-outline ${panelAction === 'reset' ? 'active' : ''}`} 
          onClick={() => { setPanelAction('reset'); setMessage({text:'', type:''}); setAdminPassword(''); }}
        >
          <KeyRound size={16} /> Reset Password
        </button>
      </div>

      <div className="admin-content">
        {panelAction === 'list' && (
          <div className="users-list-card">
            <h3>Usuarios Registrados</h3>
            {loading ? (
               <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 size={24} className="animate-spin" /></div>
            ) : users.length === 0 ? (
               <p style={{ color: '#6b7280' }}>No hay usuarios regulares adicionales.</p>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.username}>
                      <td>{u.username}</td>
                      <td><span className="badge">{u.role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {panelAction === 'create' && (
          <div className="admin-form-card">
             <h3>Crear Nuevo Usuario</h3>
             <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label>Nombre de Usuario</label>
                  <input type="text" className="form-control" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Contraseña para el Nuevo Usuario</label>
                  <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="form-spacer"></div>
                <div className="form-group warning-group">
                  <label>Tu Contraseña de Administrador (Confirmación)</label>
                  <input type="password" className="form-control" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
                </div>

                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                  <button type="button" className="btn-outline" onClick={() => setPanelAction('list')}>Cancelar</button>
                  <button type="submit" className="btn-dark" disabled={actionLoading}>
                    {actionLoading ? 'Verificando...' : 'Crear Usuario'}
                  </button>
                </div>
             </form>
          </div>
        )}

        {panelAction === 'reset' && (
          <div className="admin-form-card">
             <h3>Resetear Contraseña de un Usuario</h3>
             <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>Seleccionar Usuario</label>
                  <select className="form-control" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
                    <option value="" disabled>-- Elige un usuario --</option>
                    {users.map(u => (
                      <option key={u.username} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nueva Contraseña</label>
                  <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="form-spacer"></div>
                <div className="form-group warning-group">
                  <label>Tu Contraseña de Administrador (Confirmación)</label>
                  <input type="password" className="form-control" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
                </div>

                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                  <button type="button" className="btn-outline" onClick={() => setPanelAction('list')}>Cancelar</button>
                  <button type="submit" className="btn-dark" disabled={actionLoading}>
                    {actionLoading ? 'Verificando...' : 'Resetear Contraseña'}
                  </button>
                </div>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}
