import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDraft } from '../context/DraftContext';

const QuickAccessPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const draftId = params.get('d');
  const accessCode = params.get('r');
  const navigate = useNavigate();
  const { joinDraft } = useDraft();
  const [error, setError] = useState(null);

  useEffect(() => {
    const quickAccess = async () => {
      try {
        // Determina il ruolo dal prefisso del codice di accesso
        let role = 'spectator';
        if (accessCode.startsWith('AD')) {
          role = 'admin';
        } else if (accessCode.startsWith('BL')) {
          role = 'blue';
        } else if (accessCode.startsWith('RD')) {
          role = 'red';
        }

        // Salva il codice di accesso in sessionStorage
        sessionStorage.setItem('draftAccessCode', accessCode);

        // Tenta di unirsi al draft
        await joinDraft(draftId, role);

        // Naviga alla pagina del draft
        navigate(`/?d=${draftId}`);
      } catch (err) {
        console.error('Quick access error:', err);
        setError('Unable to join draft. Check the link and try again.');
        
        // Torna alla pagina di login dopo un breve ritardo
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    quickAccess();
  }, [draftId, accessCode, joinDraft, navigate]);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>Access Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Accessing draft...</p>
    </div>
  );
};

export default QuickAccessPage;