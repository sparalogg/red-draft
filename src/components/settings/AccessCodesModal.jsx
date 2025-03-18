import React from 'react';

const AccessCodesModal = ({ show, onHide, draftId, accessCodes }) => {
  if (!show) return null;
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Potrebbe mostrare una notifica di successo
      })
      .catch(err => {
        console.error('Errore durante la copia negli appunti:', err);
      });
  };
  
  return (
    <div className="modal-backdrop">
      <div className="modal-content access-codes-modal">
        <div className="modal-header">
          <h5 className="modal-title">Codici di Accesso</h5>
          <button type="button" className="btn-close" onClick={onHide}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="access-codes-intro">
            Ecco i codici di accesso per questo draft. Condividili con i capitani delle squadre.
          </p>
          
          <div className="code-box">
            <h3>Codice Draft</h3>
            <div className="code-value main-code">{draftId}</div>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard(draftId)}
              title="Copia negli appunti"
            >
              <i className="fas fa-copy"></i>
            </button>
            <p className="code-note">Condividi questo codice con tutti i partecipanti</p>
          </div>
          
          <div className="access-codes-list">
            <div className="code-box admin-code">
              <h3>Codice Admin</h3>
              <div className="code-value">{accessCodes.admin || 'N/A'}</div>
              <button 
                className="copy-btn" 
                onClick={() => copyToClipboard(accessCodes.admin)}
                title="Copia negli appunti"
              >
                <i className="fas fa-copy"></i>
              </button>
              <p className="code-note">Solo per controllo completo</p>
            </div>
            
            <div className="code-box blue-code">
              <h3>Codice Team Blu</h3>
              <div className="code-value">{accessCodes.blue || 'N/A'}</div>
              <button 
                className="copy-btn" 
                onClick={() => copyToClipboard(accessCodes.blue)}
                title="Copia negli appunti"
              >
                <i className="fas fa-copy"></i>
              </button>
              <p className="code-note">Per il capitano del Team Blu</p>
            </div>
            
            <div className="code-box red-code">
              <h3>Codice Team Rosso</h3>
              <div className="code-value">{accessCodes.red || 'N/A'}</div>
              <button 
                className="copy-btn" 
                onClick={() => copyToClipboard(accessCodes.red)}
                title="Copia negli appunti"
              >
                <i className="fas fa-copy"></i>
              </button>
              <p className="code-note">Per il capitano del Team Rosso</p>
            </div>
          </div>
          
          <div className="info-box mt-4">
            <p>Gli spettatori possono accedere senza codice di accesso, inserendo solo il codice draft.</p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onHide}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessCodesModal;