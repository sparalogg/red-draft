import React, { useState, useEffect } from 'react';
import { useDraft } from '../../context/DraftContext';
import { database } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';

const ConnectionStatus = () => {
  const { state } = useDraft();
  const [connections, setConnections] = useState({
    blue: false,
    red: false,
    spectator: false,
    admin: false
  });

  useEffect(() => {
    if (!state.draftId || state.userTeam !== 'admin') return;

    // Riferimento alla sezione "presence" del draft
    const presenceRef = ref(database, `drafts/${state.draftId}/presence`);
    
    // Sottoscrivi agli aggiornamenti di presenza
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const presenceData = snapshot.val();
        
        // Determina quali ruoli sono connessi
        const now = Date.now();
        const activeThreshold = 30000; // 60 secondi
        
        setConnections({
          blue: presenceData.blue && (now - presenceData.blue < activeThreshold),
          red: presenceData.red && (now - presenceData.red < activeThreshold),
          spectator: presenceData.spectator && (now - presenceData.spectator < activeThreshold),
          admin: presenceData.admin && (now - presenceData.admin < activeThreshold)
        });
      }
    });
    
    // Pulizia della sottoscrizione
    return () => unsubscribe();
  }, [state.draftId, state.userTeam]);

  // Non mostrare nulla se non è admin
  if (state.userTeam !== 'admin') return null;

  return (
    <div className="connection-status mt-3">
      <h4>Status connections:</h4>
      <div className="connection-indicators">
        <div className={`connection-indicator ${connections.blue ? 'active' : 'inactive'}`}>
          <span className="indicator-dot"></span>
          <span className="indicator-label">Team Blue</span>
        </div>
        <div className={`connection-indicator ${connections.red ? 'active' : 'inactive'}`}>
          <span className="indicator-dot"></span>
          <span className="indicator-label">Team Red</span>
        </div>
        <div className={`connection-indicator ${connections.spectator ? 'active' : 'inactive'}`}>
          <span className="indicator-dot"></span>
          <span className="indicator-label">Spectators</span>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;