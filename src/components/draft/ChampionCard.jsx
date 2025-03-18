import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../../context/DraftContext';

const ChampionCard = ({ champion, canSelect = true, spectatorMode = false }) => {
  const { t } = useTranslation();
  const { 
    state, 
    selectChampion, 
    isChampionSelectable, 
    isChampionSelectedInCurrentStep 
  } = useDraft();
  
  // Forza un aggiornamento del componente quando cambiano i campioni disabilitati
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Aggiorna il componente quando cambiano le impostazioni
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [state.settings, state.disabledChampions]);
  
  const { id, name, image, isReusable } = champion;
  
  // Determina se l'utente è in modalità spettatore
  const isSpectator = state.userTeam === 'spectator';
  
  // Estrai in modo esplicito gli array di campioni disabilitati
  const disabledFromSettings = state.settings?.disabledChampions || [];
  const disabledFromState = state.disabledChampions || [];
  
  // Combina entrambi gli array per maggiore sicurezza
  const allDisabledChampions = [...new Set([...disabledFromSettings, ...disabledFromState])];
  
  // Verifica esplicita se questo campione è disabilitato
  const isDisabled = allDisabledChampions.some(disabledId => {
    // Verifica se entrambi gli ID sono non-null
    if (disabledId && id) {
      // Converti entrambi in stringhe per sicurezza
      const disabledIdStr = String(disabledId);
      const championIdStr = String(id);
      
      // Confronta in modo case-insensitive
      return disabledIdStr.toLowerCase() === championIdStr.toLowerCase();
    }
    // Confronto diretto per tipi non stringa
    return disabledId === id;
  });
  
  // Log dettagliato per debug
  useEffect(() => {
    /*console.log(`Champion ${id}:`, {
      isDisabled,
      disabledFromSettings,
      disabledFromState,
      allDisabledChampions,
      forceUpdate
    });*/
  }, [id, isDisabled, disabledFromSettings, disabledFromState, allDisabledChampions, forceUpdate]);
  
  // Determina se il campione è selezionabile
  const selectable = !isDisabled && isChampionSelectable(id, isReusable);
  
  // Determina se il campione è attualmente selezionato
  const isSelected = isChampionSelectedInCurrentStep(id);
  
  // È il draft attualmente attivo?
  const isDraftActive = state.currentPhase !== 'notStarted' && 
                        state.currentPhase !== 'completed' && 
                        !state.isPaused;
  
  // L'utente può selezionare campioni
  const userCanSelect = canSelect && 
                       (state.userTeam === 'admin' || 
                        state.userTeam === state.currentTeam);
  
  // Gestisce il click sul campione
  const handleClick = () => {
    // Log per debug
    if (isDisabled) {
      //console.log(`Click bloccato su campione disabilitato: ${id}`);
      return;
    }
    
    if (isDraftActive && selectable && userCanSelect) {
      //console.log(`Selezionato campione: ${id}`);
      selectChampion(champion, state.currentTeam);
    }
  };
  
  // CSS classes con stile inline per disabilitati
  const cardStyle = isDisabled ? {
    opacity: 0.6,
    position: 'relative',
    pointerEvents: 'none'
  } : {};
  
  // CSS classes per lo styling
  const cardClasses = [
    'champion-card',
    id === 'empty' || isReusable ? 'empty-champion' : '',
    isSelected ? 'selected' : '',
    !selectable || !userCanSelect ? 'disabled' : '',
    isSpectator ? 'spectator-mode' : '',
    isDisabled ? 'champion-disabled' : '',
  ].filter(Boolean).join(' ');
  
  // Se è il campione vuoto
  if (id === 'empty' || !image) {
    return (
      <div 
        className={cardClasses}
        style={cardStyle}
        data-id={id}
        data-reusable={isReusable ? 'true' : 'false'}
        data-disabled={isDisabled ? 'true' : 'false'}
        onClick={isSpectator ? undefined : handleClick}
      >
        <div className="d-flex flex-column align-items-center justify-content-center h-100">
          <i className="fas fa-user-plus" style={{ fontSize: '2rem', color: '#aaa' }}></i>
          <div className="mt-2 fs-6">PG Vuoto</div>
        </div>
        
        {/* Overlay per campioni disabilitati (renderizzato in modo più diretto) */}
        {isDisabled && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontWeight: 'bold',
            zIndex: 10
          }}>
            <i className="fas fa-ban" style={{ 
              fontSize: '2rem', 
              marginBottom: '8px',
              color: '#ff4d4d'
            }}></i>
            <span style={{
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              letterSpacing: '1px'
            }}> </span>
          </div>
        )}
      </div>
    );
  }
  
  // Fix del percorso immagine
  const imagePath = image.startsWith('/') ? image : `/${image}`;
  
  return (
    <div 
      className={cardClasses}
      style={cardStyle}
      data-id={id}
      data-reusable={isReusable ? 'true' : 'false'}
      data-disabled={isDisabled ? 'true' : 'false'}
      onClick={isSpectator ? undefined : handleClick}
    >
      <img src={imagePath} alt={name} />
      <div className="champion-name">{name}</div>
      
      {/* Overlay per campioni disabilitati (renderizzato in modo più diretto) */}
      {isDisabled && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          fontWeight: 'bold',
          zIndex: 10
        }}>
          <i className="fas fa-ban" style={{ 
            fontSize: '2rem', 
            marginBottom: '8px',
            color: '#ff4d4d'
          }}></i>
          <span style={{
            textTransform: 'uppercase',
            fontSize: '0.8rem',
            letterSpacing: '1px'
          }}> </span>
        </div>
      )}
    </div>
  );
};

export default ChampionCard;