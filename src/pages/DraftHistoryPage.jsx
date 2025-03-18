import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDraft } from '../context/DraftContext';
import { clearDraftRole } from '../utils/draftRoleStorage';

/**
 * Pagina per visualizzare lo storico dei draft recenti dell'utente
 */
const DraftHistoryPage = () => {
  const [myDrafts, setMyDrafts] = useState([]);
  const [participatedDrafts, setParticipatedDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' o 'participated'
  
  const { user } = useAuth();
  const { getUserDrafts, getUserParticipatedDrafts, deleteDraft, joinDraft } = useDraft();
  const navigate = useNavigate();
  
  // Carica i draft dell'utente
  useEffect(() => {
    const loadDrafts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Ottieni i draft creati dall'utente
        const myDraftsList = await getUserDrafts(user.uid);
        setMyDrafts(myDraftsList);
        
        // Ottieni i draft a cui l'utente ha partecipato
        const participatedDraftsList = await getUserParticipatedDrafts(user.uid);
        setParticipatedDrafts(participatedDraftsList);
      } catch (error) {
        console.error('Errore durante il caricamento dei draft:', error);
        setError('Si è verificato un errore durante il caricamento dei draft.');
      } finally {
        setLoading(false);
      }
    };
    
    loadDrafts();
  }, [user, getUserDrafts, getUserParticipatedDrafts]);
  
  // Formatta data e ora
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calcola il tempo rimanente prima della scadenza
  const getTimeUntilExpiration = (expiresAt) => {
    if (!expiresAt) return 'N/A';
    
    const now = Date.now();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) return 'Scaduto';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ore, ${minutes} minuti`;
  };
  
  

  // Gestisce l'eliminazione di un draft
  const handleDeleteDraft = async (draftId) => {
    if (!user) return;
    
    if (window.confirm('Sei sicuro di voler eliminare questo draft? Questa azione non può essere annullata.')) {
      try {
        const success = await deleteDraft(draftId, user.uid);
        
        if (success) {
          // Aggiorna la lista rimuovendo il draft eliminato
          setMyDrafts(myDrafts.filter(draft => draft.draftId !== draftId));
          setParticipatedDrafts(participatedDrafts.filter(draft => draft.draftId !== draftId));
          
          // Elimina il ruolo salvato per questo draft
          clearDraftRole(draftId);
        } else {
          setError('Non è stato possibile eliminare il draft. Potresti non avere i permessi necessari.');
        }
      } catch (error) {
        console.error('Errore durante l\'eliminazione del draft:', error);
        setError('Si è verificato un errore durante l\'eliminazione del draft.');
      }
    }
  };
  
  // Gestisce il join a un draft
  const handleJoinDraft = async (draftId, role) => {
    try {
      await joinDraft(draftId, role, user.uid);
      navigate(`/draft/${draftId}`);
    } catch (error) {
      console.error('Errore durante il join al draft:', error);
      setError('Non è stato possibile accedere al draft.');
    }
  };
  
  // Ottieni la visualizzazione appropriata per lo stato del draft
  const getDraftStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge bg-success">Attivo</span>;
      case 'in_progress':
        return <span className="badge bg-primary">In corso</span>;
      case 'completed':
        return <span className="badge bg-info">Completato</span>;
      case 'expired':
        return <span className="badge bg-secondary">Scaduto</span>;
      case 'reset':
        return <span className="badge bg-warning">Resettato</span>;
      default:
        return <span className="badge bg-dark">Sconosciuto</span>;
    }
  };
  
  // Se non c'è un utente loggato, reindirizza alla home
  if (!user && !loading) {
    navigate('/');
    return null;
  }
  
  // Rendering dei draft
  const renderDrafts = (drafts) => {
    if (drafts.length === 0) {
      return (
        <div className="empty-state">
          <p>Nessun draft trovato.</p>
        </div>
      );
    }
    
    return (
      <div className="draft-list">
        {drafts.map(draft => (
          <div key={draft.draftId} className="draft-card">
            <div className="draft-card-header">
              <h3 className="draft-code">Draft #{draft.draftId}</h3>
              {getDraftStatusBadge(draft.status)}
            </div>
            
            <div className="draft-card-details">
              <div className="detail-group">
                <span className="detail-label">Creato il:</span>
                <span className="detail-value">{formatDateTime(draft.createdAt)}</span>
              </div>
              
              <div className="detail-group">
                <span className="detail-label">Scade tra:</span>
                <span className="detail-value">{getTimeUntilExpiration(draft.expiresAt)}</span>
              </div>
              
              <div className="detail-group">
                <span className="detail-label">Partecipanti:</span>
                <span className="detail-value">{Object.keys(draft.participants || {}).length}</span>
              </div>
            </div>
            
            <div className="draft-card-actions">
              {/* Action buttons */}
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => handleJoinDraft(draft.draftId, activeTab === 'my' ? 'admin' : 'spectator')}
                disabled={draft.status === 'expired'}
              >
                Vai al Draft
              </button>
              
              {activeTab === 'my' && (
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteDraft(draft.draftId)}
                >
                  Elimina
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="history-container">
      <div className="history-header">
        <h1>I tuoi Draft</h1>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          Torna alla Home
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          Draft creati da te
        </button>
        <button 
          className={`tab-btn ${activeTab === 'participated' ? 'active' : ''}`}
          onClick={() => setActiveTab('participated')}
        >
          Draft a cui hai partecipato
        </button>
      </div>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Caricamento draft in corso...</p>
        </div>
      ) : (
        <div className="tab-content">
          {activeTab === 'my' ? renderDrafts(myDrafts) : renderDrafts(participatedDrafts)}
        </div>
      )}
      
      <div className="info-box">
        <h4>Informazioni</h4>
        <p>I draft sono disponibili per 24 ore dalla loro creazione, dopo di che verranno automaticamente eliminati.</p>
      </div>
    </div>
  );
};

export default DraftHistoryPage;