import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../context/DraftContext';
import { useSettings } from '../context/SettingsContext';

// Components
import TeamPanel from '../components/draft/TeamPanel';
import ChampionGrid from '../components/draft/ChampionGrid';
import Timer from '../components/common/Timer';
import PhaseIndicator from '../components/draft/PhaseIndicator';
import PreviewBox from '../components/draft/PreviewBox';
import SettingsModal from '../components/settings/SettingsModal';
import Instructions from '../components/layout/Instructions';
import TeamHeader from '../components/layout/TeamHeader';
import CoinFlipModal from '../components/draft/CoinFlipModal';
import BonusTimeDisplay from '../components/draft/BonusTimeDisplay';
import { getDraftRole, saveDraftRole } from '../utils/draftRoleStorage';
import { clearDraftRole, cleanupOldRoles } from '../utils/draftRoleStorage';
import ConnectionStatus from '../components/common/ConnectionStatus';


const { ref, set } = require('firebase/database');
const { database } = require('../services/firebase');


const DraftPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const draftId = params.get('d'); 
  const navigate = useNavigate();
  const { 
    state, 
    startDraft, 
    joinDraft, 
    resetDraft, 
    togglePause,
    updateTeamNames ,
    setCoinFlipStatus,
    leaveDraft  
  } = useDraft();
  const { settings } = useSettings();
  
  // State for modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCoinFlipModal, setShowCoinFlipModal] = useState(false);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState(null);
  
  const handleExitDraft = async () => {
    // Pulisci i ruoli vecchi a ogni uscita
    cleanupOldRoles(7); // Pulisce i ruoli più vecchi di 7 giorni
    
    // Se abbiamo un draftId e un userTeam, proviamo a lasciare il draft correttamente
    if (state.draftId && state.userTeam) {
      try {
        // Chiama leaveDraft dal context
        await leaveDraft();
        //console.log("Disconnessione dal draft completata");
      } catch (error) {
        console.error("Errore durante la disconnessione:", error);
      }
    }
    
    // Naviga alla home page
    navigate('/');
  };

  // Handle the start/new draft button
  const handleStartDraft = () => {
    /*console.log('Avvio draft', {
      startingTeam: state.settings.startingTeam,
      currentPhase: state.currentPhase
    });*/
  
    // Mostra la modale di lancio moneta solo se nelle impostazioni è selezionato 'coinFlip'
    if (state.settings.startingTeam === 'coinFlip') {
      //console.log("Avvio coin flip");
      // Usa setCoinFlipStatus direttamente, non tramite state
      setCoinFlipStatus(true);
    } else {
      // Se non è lancio moneta, avvia direttamente il draft
      startDraft();
    }
  };

  const handleCoinFlipModalClose = (startingTeam) => {
    //console.log('Chiusura coin flip modal', { startingTeam });
    
    // Nascondi il modal
    setShowCoinFlipModal(false);
    
    // Avvia il draft con il team selezionato
    startDraft(startingTeam);
  };

  
  const initialized = useRef(false);
  

  // Leggi il codice di accesso da sessionStorage
  const storedAccessCode = useRef(sessionStorage.getItem('draftAccessCode'));

  useEffect(() => {
    if (storedAccessCode.current) {
      //console.log("Trovato codice di accesso in sessionStorage:", storedAccessCode.current);
      sessionStorage.removeItem('draftAccessCode');
    }
  }, []);
  
  useEffect(() => {
    // Tutti i client dovrebbero vedere o nascondere la modale in base allo stato globale
    if (state.coinFlipInProgress && !showCoinFlipModal) {
      //console.log(`${state.userTeam}: Mostro coin flip modal`);
      setShowCoinFlipModal(true);
    }
    
    if (!state.coinFlipInProgress && showCoinFlipModal) {
      //console.log(`${state.userTeam}: Nascondo coin flip modal`);
      setShowCoinFlipModal(false);
    }
  }, [state.coinFlipInProgress, showCoinFlipModal]);

  // Join the draft when component mounts - usando useRef per evitare il loop
  useEffect(() => {
    // Se è già stato inizializzato, non farlo di nuovo
    if (initialized.current) return;
    
    const connectToDraft = async () => {
      if (!draftId) {
        //console.log("No draftId provided");
        return;
      }
      
      //console.log("Connecting to draft:", draftId);
      setIsJoining(true);
      
      try {
        // Verifico se c'è un ruolo salvato per questo draft
        const savedRoleData = getDraftRole(draftId);
        
        // Determina il ruolo
        let role = 'spectator'; // Default role
        let effectiveAccessCode = null;
        
        // Prima controlla se c'è un codice di accesso in sessionStorage (ha priorità)
        const sessionAccessCode = storedAccessCode.current;
        
        // Carica i nomi dei team salvati (se presenti)
        const savedTeamNames = sessionStorage.getItem('teamNames');
        let parsedTeamNames = null;
        
        if (savedTeamNames) {
          try {
            parsedTeamNames = JSON.parse(savedTeamNames);
            //console.log("Trovati nomi team in sessionStorage:", parsedTeamNames);
          } catch (e) {
            console.error("Errore nel parsing dei nomi team:", e);
          }
          // Pulisci sessionStorage dopo l'uso
          sessionStorage.removeItem('teamNames');
        }
        
        if (sessionAccessCode) {
          //console.log("Using session access code:", sessionAccessCode);
          effectiveAccessCode = sessionAccessCode;
          if (sessionAccessCode.startsWith('AD')) {
            role = 'admin';
          } else if (sessionAccessCode.startsWith('BL')) {
            role = 'blue';
          } else if (sessionAccessCode.startsWith('RD')) {
            role = 'red';
          }
          // Dopo aver usato il codice dalla sessionStorage, lo rimuoviamo
          storedAccessCode.current = null;
          sessionStorage.removeItem('draftAccessCode');
        } 
        // Se non c'è un codice in sessionStorage, usa quello salvato in localStorage (se esiste)
        else if (savedRoleData && savedRoleData.role && savedRoleData.role !== 'spectator') {
          //console.log("Ripristino del ruolo salvato:", savedRoleData.role);
          role = savedRoleData.role;
          effectiveAccessCode = savedRoleData.accessCode;
        }
        
        //console.log("Joining draft as:", role);
        
        // Se abbiamo un codice di accesso, lo utilizziamo
        if (effectiveAccessCode && role !== 'spectator') {
          // Salviamo il ruolo e il codice nel localStorage per i futuri accessi
          saveDraftRole(draftId, role, effectiveAccessCode);
        }
        
        // Join del draft con il ruolo determinato
        await joinDraft(draftId, role);
        //console.log("Successfully joined draft");
        
        // Se abbiamo nomi dei team in sessionStorage e siamo admin,
        // impostiamoli dopo il join (con un breve ritardo per sicurezza)
        if (parsedTeamNames && role === 'admin') {
          setTimeout(() => {
            //console.log("Aggiorno i nomi dei team da sessionStorage:", parsedTeamNames);
            // Assicurati che draftContext.updateTeamNames sia disponibile
            if (typeof updateTeamNames === 'function') {
              updateTeamNames(
                parsedTeamNames.blue || 'Blue Team',
                parsedTeamNames.red || 'Red Team'
              ).catch(err => console.error("Errore nell'aggiornamento dei nomi team:", err));
            }
          }, 1000); // ritardo di 1 secondo
        }
        
        setIsJoining(false);
      } catch (error) {
        console.error('Error connecting to draft:', error);
        setError('Unable to connect to draft. It may no longer exist.');
        setIsJoining(false);
      }
    };
    
    connectToDraft();
    initialized.current = true;
    
  }, []);

  useEffect(() => {
    // Mostra il modal solo quando si inizia il draft, non all'accesso
    if (
      settings.coinFlipEnabled === true && 
      state.currentPhase === 'notStarted' && 
      showCoinFlipModal
    ) {
      // Chiudi immediatamente il modal se è apparso all'accesso
      setShowCoinFlipModal(false);
    }
  }, [settings.coinFlipEnabled, state.currentPhase, showCoinFlipModal]);

  // Redirect to home if there's an error
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, navigate]);
  
  // Handle reset draft
  const handleResetDraft = async () => {
    if (state.userTeam !== 'admin') {
      alert("Solo l'amministratore può resettare il draft.");
      return;
    }
    
    if (window.confirm("Are you sure you want to reset the draft? This action will clear all selections.")) {
      try {
        // Mostra un indicatore di caricamento
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'global-loading';
        loadingDiv.innerHTML = `
          <div class="global-loading-backdrop"></div>
          <div class="global-loading-content">
            <div class="global-loading-spinner"></div>
            <p>Reset in progress...</p>
          </div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Esegui il reset
        const success = await resetDraft();
        
        // Rimuovi l'indicatore di caricamento
        if (document.body.contains(loadingDiv)) {
          document.body.removeChild(loadingDiv);
        }
        
        if (success) {
          //console.log("Reset completed successfully");
          alert("Draft reset successfully!");
        } else {
          console.error("Reset fallito");
          alert("Si è verificato un errore durante il reset.");
        }
      } catch (error) {
        console.error("Errore durante il reset:", error);
        alert(`An error occurred during the reset: ${error.message}`);
      }
    }
  };
  
  // Handle toggle pause
  const handleTogglePause = () => {
    togglePause();
  };

  // Check if the user can modify the draft
  const canModifyDraft = state.userTeam === 'admin' || 
                         state.userTeam === state.currentTeam;
  
  // Verifica se l'utente è uno spettatore
  const isSpectator = state.userTeam === 'spectator' || !state.userTeam;
  
  // If there's an error, show error message
  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>Errore</h2>
          <p>{error}</p>
          <p>Redirect...</p>
        </div>
      </div>
    );
  }
  
  // Show loading state until we've joined the draft
  if (isJoining) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading draft...</p>
      </div>
    );
  }
  
  return (
    <div className="main-container">
      
      {/* Headers with team names and timer */}
      <div className="team-headers">
        <TeamHeader team="blue" />
        <Timer />
        <TeamHeader team="red" />
      </div>
      
      {/* Preview section - mostrato solo a admin e membri dei team, non agli spettatori */}
      {!isSpectator ? (
        <div className="preview-section">
          <PreviewBox team="blue" />
          <div className="middleBox">
            <img className="draft-logo" src="/images/pred-draft.png" alt="Draft logo" />
            <img className="draftSprite" src="/images/rotationSprite.webp" alt="Draft sprite" />
          </div>
          <PreviewBox team="red" />
        </div>
      ) : (
        <div className="preview-section spectator-view">
          <div className="middleBox">
            <img className="draft-logo" src="/images/pred-draft.png" alt="Draft logo" />
            <img className="draftSprite" src="/images/rotationSprite.webp" alt="Draft sprite" />
          </div>
        </div>
      )}
      
      {/* Main draft container */}
      <div className="draft-container">
        {/* Blue team column */}
        <TeamPanel team="blue" />
        
        {/* Center column with champions grid */}
        <div className="champions-column">
          <ChampionGrid canSelect={canModifyDraft} />
          
          {/* Start/New draft button - only shown to admin */}
          {state.userTeam === 'admin' && (
            <div className="admin-controls">
            <ConnectionStatus />
            
          </div>
          )}

          {(state.currentPhase === 'notStarted' || state.currentPhase === 'completed') && 
           state.userTeam === 'admin' && (
            <div className="admin-controls">
            <button className="btn-start predButton" id="startBtn" onClick={handleStartDraft}>
              <span className="predButtonSpan">
              {state.currentPhase === 'completed' 
                ? t('buttons.newDraft') 
                : 'START DRAFT'}
              </span>
            </button>
          </div>
          )}
        </div>
        
        {/* Red team column */}
        <TeamPanel team="red" />
      </div>
      
      {/* Controls */}
      <div className="controls">
        <button 
          className="btn-draft btn-blue predPauseButton" 
          id="pauseBtn"
          onClick={handleTogglePause}
          disabled={state.userTeam !== 'admin'}
        ><span className="predButtonSpan">
          <i className={`fas ${state.isPaused ? 'fa-play' : 'fa-pause'} me-2`}></i>
          {state.isPaused ? t('buttons.resume') : t('buttons.pause')}
        </span>
        </button>
        
        <button 
          className="btn-draft btn-red predResetButton" 
          id="resetBtn"
          onClick={handleResetDraft}
          disabled={state.userTeam !== 'admin'}
        ><span className="predButtonSpan">
          <i className="fas fa-redo me-2"></i>
          Reset
          </span>
        </button>
        
        <button 
          className="btn-draft" 
          id="settingsBtn" 
          onClick={() => setShowSettingsModal(true)}
          disabled={(state.currentPhase !== 'notStarted' && 
                     state.currentPhase !== 'completed') || 
                    state.userTeam !== 'admin'}
        >
          <i className="fas fa-cog me-2"></i>
          {t('buttons.settings')}
        </button>
        
        <button 
          className="btn-draft" 
          id="exitBtn"
          onClick={handleExitDraft}
        >
          <i className="fas fa-sign-out-alt me-2"></i>
          Exit
        </button>
      </div>
      
      {/* Phase info */}
      <div className="draft-info">
        <div className="phase-indicator" id="phaseIndicator">
          {state.currentPhase === 'notStarted' 
            ? t('draft.phase.waiting')
            : state.currentPhase === 'completed'
              ? t('draft.phase.completed')
              : state.draftSequence[state.currentStepIndex]?.phase || ''}
        </div>
        <div className="draft-code-badge">
          {t('settings.code_draft')}: <span className="draft-code">{draftId}</span>
          {state.userTeam && (
            <span className={`user-team ${state.userTeam}-team`}><center>
              {state.userTeam === 'blue' ? 'Team Blue' : 
              state.userTeam === 'red' ? 'Team Red' : 
              state.userTeam === 'admin' ? 'Admin' : 'Spectator'}
            </center></span>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <Instructions />
      
      {/* Modals */}
      <SettingsModal 
        show={showSettingsModal} 
        onHide={() => setShowSettingsModal(false)} 
      />
      
      {showCoinFlipModal && (
        <CoinFlipModal />
      )}
      
      <BonusTimeDisplay />
    </div>
  );
};

export default DraftPage;