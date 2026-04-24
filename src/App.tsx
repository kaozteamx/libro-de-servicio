import { useState, useEffect } from 'react';
import { BookOpen, FolderOpen, ChevronDown, ChevronRight, Plus, ExternalLink, Trash2, X, FileText, Link as LinkIcon, Loader2, LogOut, Settings, Pencil, Download, FileSpreadsheet, File } from 'lucide-react';
import { INITIAL_DATA } from './types';
import type { Category, PeriodFolder } from './types';
import { supabase } from './supabase';
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';
// Constants
const YEARS = ['2023', '2024', '2025', '2026', '2027', '2028'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));

type ModalState = {
  isOpen: boolean;
  categoryId: string;
  categoryName: string;
  step: 1 | 2;
  day: string;
  year: string;
  month: string;
  docName: string;
  url: string;
  observations: string;
  folderDescription: string;
  mode?: 'create' | 'edit';
  linkId?: string;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
  
  const [exportModal, setExportModal] = useState<{isOpen: boolean, categoryId: string, categoryName: string, periods: PeriodFolder[]}>({
    isOpen: false,
    categoryId: '',
    categoryName: '',
    periods: []
  });

  // Modal State
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    categoryId: '',
    categoryName: '',
    step: 1,
    day: '01',
    year: '2026',
    month: 'Abril',
    docName: '',
    url: '',
    observations: '',
    folderDescription: '',
    mode: 'create'
  });

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('service_links').select('*');
      
      if (error) {
        if (error.message.includes('relation "public.service_links" does not exist')) {
          console.warn('⚠️ La base de datos aún no está configurada. Ejecuta el script SQL en Supabase.');
          return;
        }
        throw error;
      }
      
      if (!data) return;

      // Restablecer categorías base para poblar
      const newCategories = INITIAL_DATA.map(initCat => ({
        ...initCat,
        periods: [] as PeriodFolder[]
      }));

      data.forEach(row => {
        const cat = newCategories.find(c => c.id === row.category_id);
        if(!cat) return;

        let period = cat.periods.find(p => p.label === row.period_label);
        if(!period){
          period = {
            id: `folder-${row.category_id}-${row.period_label}`,
            label: row.period_label,
            records: []
          };
          cat.periods.push(period);
        }

        period.records.push({
          id: row.id,
          title: row.title,
          url: row.url,
          createdAt: new Date(row.created_at).getTime(),
          folio: row.folio,
          observations: row.observations,
          folderDescription: row.folder_description
        });
      });

      // Ordenar carpetas
      newCategories.forEach(cat => {
        cat.periods.sort((a, b) => {
          const splitA = a.label.split(' ');
          const splitB = b.label.split(' ');
          if(splitA.length < 2 || splitB.length < 2) return 0;
          
          let dayA = 1, monthA, yearA;
          if (splitA.length === 3) {
             dayA = parseInt(splitA[0]); monthA = splitA[1]; yearA = splitA[2];
          } else {
             monthA = splitA[0]; yearA = splitA[1];
          }
          
          let dayB = 1, monthB, yearB;
          if (splitB.length === 3) {
             dayB = parseInt(splitB[0]); monthB = splitB[1]; yearB = splitB[2];
          } else {
             monthB = splitB[0]; yearB = splitB[1];
          }
          
          if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
          if (monthA !== monthB) return MONTHS.indexOf(monthB) - MONTHS.indexOf(monthA);
          return dayB - dayA;
        });
      });

      setCategories(newCategories);
    } catch (e) {
      console.error('Error fetching data from Supabase', e);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos inicialmente
  useEffect(() => {
    const saved = localStorage.getItem('libro_de_servicio_user');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
    fetchLinks();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('libro_de_servicio_user');
    setCurrentUser(null);
    setShowAdminPanel(false);
  };

  const togglePeriod = (id: string) => {
    setExpandedPeriods(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openModal = (categoryId: string, categoryName: string) => {
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = MONTHS[today.getMonth()];
    const currentDay = today.getDate().toString().padStart(2, '0');
    
    setModal({
      isOpen: true,
      categoryId,
      categoryName,
      step: 1,
      day: currentDay,
      year: YEARS.includes(currentYear) ? currentYear : '2026',
      month: currentMonth,
      docName: '',
      url: '',
      observations: '',
      folderDescription: '',
      mode: 'create'
    });
  };

  const openModalForFolder = (categoryId: string, categoryName: string, folder: PeriodFolder) => {
    const parts = folder.label.split(' ');
    let day = '01', month = 'Enero', year = '2026';
    if(parts.length === 3) {
      day = parts[0].padStart(2, '0');
      month = parts[1];
      year = parts[2];
    } else if(parts.length === 2) {
      month = parts[0];
      year = parts[1];
    }
    
    const desc = folder.records.map(r=>r.folderDescription).filter(Boolean)[0] || '';

    setModal({
      isOpen: true,
      categoryId,
      categoryName,
      step: 1, // Let user confirm or change the Date
      day,
      month,
      year,
      docName: '',
      url: '',
      observations: '',
      folderDescription: desc,
      mode: 'create'
    });
  };

  const openEditModal = (record: any, folderLabel: string, categoryId: string, categoryName: string) => {
    const parts = folderLabel.split(' ');
    let day = '01', month = 'Enero', year = '2026';
    if(parts.length === 3) {
      day = parts[0].padStart(2, '0');
      month = parts[1];
      year = parts[2];
    } else if(parts.length === 2) {
      month = parts[0];
      year = parts[1];
    }

    setModal({
      isOpen: true,
      categoryId,
      categoryName,
      step: 1, 
      day,
      month,
      year,
      docName: record.title,
      url: record.url,
      observations: record.observations || '',
      folderDescription: record.folderDescription || '',
      mode: 'edit',
      linkId: record.id
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    setIsSaving(false);
  };

  const handleNextStep = () => {
    setModal(prev => ({ ...prev, step: 2 }));
  };

  const handleBackToStep1 = () => {
    setModal(prev => ({ ...prev, step: 1 }));
  };

  const handleSaveLink = async () => {
    if (!modal.docName.trim() || !modal.url.trim()) return;

    let finalUrl = modal.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const folderLabel = `${modal.day} ${modal.month} ${modal.year}`;

    setIsSaving(true);
    let error;

    if (modal.mode === 'edit' && modal.linkId) {
      const { error: updateError } = await supabase.from('service_links').update({
        category_id: modal.categoryId,
        period_label: folderLabel,
        title: modal.docName.trim(),
        url: finalUrl,
        observations: modal.observations,
        folder_description: modal.folderDescription
      }).eq('id', modal.linkId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('service_links').insert([{
        category_id: modal.categoryId,
        period_label: folderLabel,
        title: modal.docName.trim(),
        url: finalUrl,
        observations: modal.observations,
        folder_description: modal.folderDescription
      }]);
      error = insertError;
    }

    if (!error) {
      await fetchLinks();
      setExpandedPeriods(prev => ({ ...prev, [`folder-${modal.categoryId}-${folderLabel}`]: true }));
      closeModal();
    } else {
      console.error("Error saving link", error);
      alert("Hubo un error al guardar en la nube. Revisa si tus llaves de Supabase son correctas.");
      setIsSaving(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    if(!confirm('¿Eliminar este enlace de forma permanente?')) return;
    const { error } = await supabase.from('service_links').delete().eq('id', linkId);
    if (!error) {
      await fetchLinks();
    } else {
      console.error("Error deleting link", error);
      alert("Error al eliminar");
    }
  };

  if (!currentUser) {
    return (
      <LoginForm onLogin={(user) => {
        setCurrentUser(user);
        localStorage.setItem('libro_de_servicio_user', JSON.stringify(user));
      }} />
    );
  }

  if (showAdminPanel && currentUser.role === 'admin') {
    return <AdminPanel adminUser={currentUser} onBack={() => setShowAdminPanel(false)} />;
  }

  return (
    <div>
      <header className="app-header">
        <div className="icon-container">
          <BookOpen strokeWidth={2} />
        </div>
        <div className="header-text">
          <h1>Libro de Servicio</h1>
          <p>Acceso organizado a solicitudes y reportes</p>
        </div>
        <div className="header-actions-right" style={{marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="user-badge" style={{display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '30px', border: '1px solid var(--border)'}}>
            <span style={{color: 'var(--text-light)', fontSize: '13px'}}>Hola, <strong style={{color: 'var(--text)'}}>{currentUser.username}</strong></span>
            {currentUser.role === 'admin' && <span className="badge" style={{background: 'var(--primary)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '12px'}}>Admin</span>}
          </div>
          {currentUser.role === 'admin' && (
            <button className="btn-icon" onClick={() => setShowAdminPanel(true)} title="Panel de Administración">
              <Settings size={20} />
            </button>
          )}
          <button className="btn-icon danger" onClick={handleLogout} title="Cerrar Sesión">
             <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="main-container">
        {loading ? (
          <div style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-light)'}}>
             <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
             <span style={{marginLeft: '1rem'}}>Sincronizando desde la nube...</span>
             <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          categories.map((category) => {
            const totalFolders = category.periods.length;
            return (
              <div key={category.id} className="category-card">
                <div className="category-header-top">
                  <div className="category-title-wrap">
                    <h2>{category.name}</h2>
                    <p>{totalFolders} {totalFolders === 1 ? 'carpeta' : 'carpetas'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button className="btn-icon" onClick={() => setExportModal({isOpen: true, categoryId: category.id, categoryName: category.name, periods: category.periods})} style={{ border: '2px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#e74c3c' }} title="Exportar Documentos">
                      <Download size={20} />
                    </button>
                    <button className="btn-add" onClick={() => openModal(category.id, category.name)}>
                      <Plus size={16} /> Agregar folio
                    </button>
                  </div>
                </div>

                {category.periods.length === 0 ? (
                  <div className="empty-state">
                    <h3>No hay carpetas todavia</h3>
                    <p>Agrega un enlace para comenzar</p>
                  </div>
                ) : (
                  <div className="folders-list">
                    {category.periods.map(folder => {
                      const isExpanded = expandedPeriods[folder.id];
                      const numLinks = folder.records.length;
                      
                      return (
                        <div key={folder.id} className="folder-item">
                          <div className="folder-header" onClick={() => togglePeriod(folder.id)}>
                            {isExpanded ? <ChevronDown size={18} color="#9CA3AF" /> : <ChevronRight size={18} color="#9CA3AF" />}
                            <FolderOpen size={20} color="var(--folder-icon)" strokeWidth={2.5} />
                            <div className="folder-title">
                              <span className="folder-folios" style={{ color: 'var(--primary)', backgroundColor: 'var(--border-dark)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                {(() => {
                                  const f = folder.records.map(r=>r.folio).filter(Boolean).sort((a,b)=>(a as number)-(b as number))[0];
                                  return `Folio(s): ${f ? String(f).padStart(4, '0') : 'N/A'}`;
                                })()}
                              </span>
                              {(() => {
                                const desc = folder.records.map(r=>r.folderDescription).filter(Boolean)[0];
                                if (desc) {
                                  return <span style={{ marginLeft: '0.75rem', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px' }}>{desc}</span>;
                                }
                                return null;
                              })()}
                            </div>
                            <button 
                              className="btn-icon" 
                              onClick={(e) => {
                                e.stopPropagation();
                                openModalForFolder(category.id, category.name, folder);
                              }} 
                              style={{ marginRight: '0.5rem', color: 'var(--primary)', border: '2px solid var(--border)', borderRadius: '6px', padding: '4px', display: 'flex', alignItems: 'center' }} 
                              title="Agregar otro folio a esta carpeta"
                            >
                              <Plus size={16} />
                            </button>
                            <button 
                              className="btn-icon" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExportModal({isOpen: true, categoryId: category.id, categoryName: `${category.name} - ${folder.label}`, periods: [folder]});
                              }} 
                              style={{ marginRight: '0.5rem', color: '#e74c3c', border: '2px solid var(--border)', borderRadius: '6px', padding: '4px', display: 'flex', alignItems: 'center' }} 
                              title="Exportar esta carpeta"
                            >
                              <Download size={16} />
                            </button>
                            <span className="folder-count">{numLinks} {numLinks === 1 ? 'enlace' : 'enlaces'}</span>
                          </div>

                          {isExpanded && (
                            <div className="folder-content">
                              {folder.records.map(record => {
                                const displayUrl = record.url.replace(/^https?:\/\/(www\.)?/, '');
                                return (
                                  <div key={record.id} className="link-item">
                                    <div className="link-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                      <div className="link-title">
                                        <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{folder.label} -</span>
                                        {record.title}
                                      </div>
                                      <div className="link-url">{displayUrl}</div>
                                      {record.observations && (
                                        <div className="link-observations" style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                          {record.observations}
                                        </div>
                                      )}
                                    </div>
                                    <div className="link-actions">
                                      <button onClick={() => openEditModal(record, folder.label, category.id, category.name)} className="btn-icon" title="Editar">
                                        <Pencil size={18} />
                                      </button>
                                      <a href={record.url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Abrir enlace">
                                        <ExternalLink size={18} />
                                      </a>
                                      <button onClick={() => deleteLink(record.id)} className="btn-icon danger" title="Eliminar">
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Modal overlays */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={isSaving ? undefined : closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <p>{modal.categoryName}</p>
                <h3>{modal.mode === 'edit' ? (modal.step === 1 ? 'Editar fecha' : 'Editar enlace') : (modal.step === 1 ? 'Seleccionar carpeta' : 'Agregar folio')}</h3>
              </div>
              <button className="btn-icon" onClick={closeModal} disabled={isSaving}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {modal.step === 1 ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Día</label>
                      <div className="form-select-wrapper">
                        <select 
                          className="form-control"
                          value={modal.day}
                          onChange={e => setModal({...modal, day: e.target.value})}
                        >
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Mes</label>
                      <div className="form-select-wrapper">
                        <select 
                          className="form-control"
                          value={modal.month}
                          onChange={e => setModal({...modal, month: e.target.value})}
                        >
                          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Año</label>
                      <div className="form-select-wrapper">
                        <select 
                          className="form-control"
                          value={modal.year}
                          onChange={e => setModal({...modal, year: e.target.value})}
                        >
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Título de la Solicitud (Opcional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. Envío de documentación mensual..."
                      value={modal.folderDescription}
                      onChange={e => setModal({...modal, folderDescription: e.target.value})}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>Este texto aparecerá al costado del folio en la carpeta principal.</p>
                  </div>
                  
                  <div className="modal-footer">
                    <button className="btn-block btn-dark" onClick={handleNextStep}>
                      Crear carpeta y continuar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label><FileText size={16}/> Nombre del documento</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ej. Reporte técnico enero"
                      value={modal.docName}
                      disabled={isSaving}
                      onChange={e => setModal({...modal, docName: e.target.value})}
                      autoFocus
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label><LinkIcon size={16}/> Enlace</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="https://..."
                      value={modal.url}
                      disabled={isSaving}
                      onChange={e => setModal({...modal, url: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label><FileText size={16}/> Observaciones (Opcional)</label>
                    <textarea 
                      className="form-control" 
                      placeholder="Comentarios, número de ticket, etc."
                      value={modal.observations}
                      disabled={isSaving}
                      onChange={e => setModal({...modal, observations: e.target.value})}
                      rows={3}
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                  
                  <div className="modal-footer">
                    <button className="btn-block btn-outline" onClick={handleBackToStep1} disabled={isSaving}>
                      Volver
                    </button>
                    <button className="btn-block btn-dark" onClick={handleSaveLink} disabled={isSaving}>
                      {isSaving ? 'Guardando...' : (modal.mode === 'edit' ? 'Guardar cambios' : 'Guardar enlace')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModal.isOpen && (
        <div className="modal-overlay" onClick={() => setExportModal(prev => ({...prev, isOpen: false}))}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>Exportar "{exportModal.categoryName}"</h3>
                <p>Selecciona el formato de descarga</p>
              </div>
              <button className="btn-icon" onClick={() => setExportModal(prev => ({...prev, isOpen: false}))}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <button 
                className="btn-block" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => {
                  import('./exportUtils').then(({ exportToPDF }) => {
                    exportToPDF(exportModal.categoryName, exportModal.periods);
                    setExportModal(prev => ({...prev, isOpen: false}));
                  });
                }}
              >
                <File size={20} /> Exportar como PDF
              </button>
              
              <button 
                className="btn-block" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => {
                  import('./exportUtils').then(({ exportToExcel }) => {
                    exportToExcel(exportModal.categoryName, exportModal.periods);
                    setExportModal(prev => ({...prev, isOpen: false}));
                  });
                }}
              >
                <FileSpreadsheet size={20} /> Exportar como Excel (XLSX)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
