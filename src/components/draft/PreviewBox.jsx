import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../../context/DraftContext';

const PreviewBox = ({ team }) => {
  const { t } = useTranslation();
  const { state, confirmSelection, selectChampion } = useDraft();
  
  // Determina il team corrente in modo più preciso
  const currentStep = state.draftSequence[state.currentStepIndex] || {};
  
  // Verifica più accurata per determinare se questo è il team corrente
  const isCurrentTeam = 
    currentStep.team === team && 
    state.currentPhase !== 'notStarted' && 
    state.currentPhase !== 'completed';
  
  // Determina se è una selezione multipla
  const isMultipleSelection = currentStep.multiSelect || false;
  const requiredSelections = currentStep.selectCount || 1;
  const currentSelections = state.currentSelections || [];

  // Può bloccare la selezione
  const canLock = isCurrentTeam && 
                  currentSelections.length > 0 && 
                  (!isMultipleSelection || currentSelections.length >= requiredSelections);
  
  // L'utente può confermare per questo team
  const userCanConfirm = (state.userTeam === team || state.userTeam === 'admin') && canLock;
  
  // Gestisce il click per bloccare
  const handleLockClick = () => {
    if (!userCanConfirm) return;
    
    if (isMultipleSelection && currentSelections.length < requiredSelections) {
      alert(`Seleziona ${requiredSelections} eroi prima di confermare (attualmente ${currentSelections.length})`);
      return;
    }
    
    confirmSelection();
  };

  // Rendering del contenuto della preview
  const renderPreviewContent = () => {
    // Se non è il turno di questo team, mostra un messaggio di attesa
    if (!isCurrentTeam) {
      return (
        <div className="d-flex justify-content-center align-items-center w-100 h-100 text-muted">
          <div className="text-center">
            <i className="fa-solid fa-hand-pointer mb-2" style={{ fontSize: '2rem' }}></i>
            <div>{t('draft.selectHero')}</div>
          </div>
        </div>
      );
    }
    
    // Se nessuna selezione, mostra messaggio di selezione
    if (currentSelections.length === 0) {
      return (
        <div className="d-flex justify-content-center align-items-center w-100 h-100 text-muted">
          <div className="text-center">
            <i className="fa-solid fa-hand-pointer mb-2" style={{ fontSize: '2rem' }}></i>
            <div>{t('draft.selectHero')}</div>
            {isMultipleSelection && (
              <div className="mt-2 badge bg-info">
                Select {requiredSelections} hero
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Mostra le selezioni correnti
    return (
      <div className="w-100">
        {/* Mostra il conteggio delle selezioni per step multipli */}
        {isMultipleSelection && (
          <div className="w-100 text-center mb-3">
            <div className="bg-dark bg-opacity-75 p-2 rounded">
              <span className="text-white">
                {currentSelections.length}/{requiredSelections} hero selected
              </span>
            </div>
          </div>
        )}
        
        <div className="d-flex flex-wrap justify-content-center">
          {currentSelections.map((selection, index) => (
            <div 
              key={index} 
              className="m-2 text-center champion-preview-item"
              style={{ cursor: 'default' }}
            >
              {selection && selection.image ? (
                <img 
                  src={selection.image.startsWith('/') ? selection.image : `/${selection.image}`} 
                  alt={selection.name || 'Champion'} 
                  style={{ height: '70px', display: 'block', margin: '0 auto' }} 
                />
              ) : (
                <i className="fa-solid fa-user-ninja" style={{ fontSize: '2rem', display: 'block', margin: '0 auto' }}></i>
              )}
              <div className="fs-6 mt-1">{selection ? selection.name : 'Unknown'}</div>
            </div>
          ))}
          
          {/* Mostra placeholder per selezioni rimanenti */}
          {isMultipleSelection && currentSelections.length < requiredSelections && (
            Array.from({ length: requiredSelections - currentSelections.length }).map((_, index) => (
              <div key={`placeholder-${index}`} className="m-2 text-center opacity-50">
                <div style={{ 
                  width: '70px', 
                  height: '70px', 
                  border: '2px dashed #aaa', 
                  borderRadius: '5px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <i className="fa-solid fa-plus" style={{ fontSize: '1.5rem', color: '#aaa' }}></i>
                </div>
                <div className="text-muted small mt-1">
                  Select {currentSelections.length + index + 1}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`team-column ${team}-column`}>
      <div 
        id={`${team}PreviewBox`}
        className={`preview-box ${isCurrentTeam ? 'active-turn' : ''}`}
      >
        {renderPreviewContent()}
      </div>
      <button
        id={`${team}LockBtn`}
        className="lock-button predButtonMini"
        disabled={!userCanConfirm}
        onClick={handleLockClick}
      >
        <span className="predButtonMiniSpan">
          {t('buttons.lock')}
        </span>
      </button>
    </div>
  );
};

export default PreviewBox;