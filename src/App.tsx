import { useState, useEffect } from 'react';
import { BookOpen, FolderOpen, ChevronDown, ChevronRight, Plus, ExternalLink, Trash2, X, FileText, Link as LinkIcon, Loader2 } from 'lucide-react';
import { INITIAL_DATA } from './types';
import type { Category, PeriodFolder } from './types';
import { supabase } from './supabase';

// Constants
const YEARS = ['2023', '2024', '2025', '2026', '2027', '2028'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type ModalState = {
  isOpen: boolean;
  categoryId: string;
  categoryName: string;
  step: 1 | 2;
  year: string;
  month: string;
  docName: string;
  url: string;
};

export default function App() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
  
  // Modal State
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    categoryId: '',
    categoryName: '',
    step: 1,
    year: '2026',
    month: 'Abril',
    docName: '',
    url: ''
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
          createdAt: new Date(row.created_at).getTime()
        });
      });

      // Ordenar carpetas
      newCategories.forEach(cat => {
        cat.periods.sort((a, b) => {
          const splitA = a.label.split(' ');
          const splitB = b.label.split(' ');
          if(splitA.length < 2 || splitB.length < 2) return 0;
          const [monthA, yearA] = splitA;
          const [monthB, yearB] = splitB;
          if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
          return MONTHS.indexOf(monthB) - MONTHS.indexOf(monthA);
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
    fetchLinks();
  }, []);

  const togglePeriod = (id: string) => {
    setExpandedPeriods(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openModal = (categoryId: string, categoryName: string) => {
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = MONTHS[new Date().getMonth()];
    
    setModal({
      isOpen: true,
      categoryId,
      categoryName,
      step: 1,
      year: YEARS.includes(currentYear) ? currentYear : '2026',
      month: currentMonth,
      docName: '',
      url: ''
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

    const folderLabel = `${modal.month} ${modal.year}`;

    setIsSaving(true);
    const { error } = await supabase.from('service_links').insert([{
      category_id: modal.categoryId,
      period_label: folderLabel,
      title: modal.docName.trim(),
      url: finalUrl
    }]);

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

  return (
    <div>
      <header className="app-header">
        <div className="icon-container">
          <BookOpen strokeWidth={2} />
        </div>
        <div className="header-text">
          <h1>Libro de Servicio</h1>
          <p>Acceso organizado a solicitudes y reportes (Sincronizado con Supabase)</p>
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
                  <button className="btn-add" onClick={() => openModal(category.id, category.name)}>
                    <Plus size={16} /> Agregar enlace
                  </button>
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
                              {folder.label}
                            </div>
                            <span className="folder-count">{numLinks} {numLinks === 1 ? 'enlace' : 'enlaces'}</span>
                          </div>

                          {isExpanded && (
                            <div className="folder-content">
                              {folder.records.map(record => {
                                const displayUrl = record.url.replace(/^https?:\/\/(www\.)?/, '');
                                return (
                                  <div key={record.id} className="link-item">
                                    <div className="link-info">
                                      <div className="link-title">{record.title}</div>
                                      <div className="link-url">{displayUrl}</div>
                                    </div>
                                    <div className="link-actions">
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
                <h3>{modal.step === 1 ? 'Seleccionar carpeta' : 'Agregar enlace'}</h3>
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
                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label><LinkIcon size={16}/> Enlace</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="https://..."
                      value={modal.url}
                      disabled={isSaving}
                      onChange={e => setModal({...modal, url: e.target.value})}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isSaving) handleSaveLink();
                      }}
                    />
                  </div>
                  
                  <div className="modal-footer">
                    <button className="btn-block btn-outline" onClick={handleBackToStep1} disabled={isSaving}>
                      Volver
                    </button>
                    <button className="btn-block btn-dark" onClick={handleSaveLink} disabled={isSaving}>
                      {isSaving ? 'Guardando...' : 'Guardar enlace'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
