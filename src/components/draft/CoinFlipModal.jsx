import React, { useState, useEffect } from 'react';
import { useDraft } from '../../context/DraftContext';
import { useTranslation } from 'react-i18next';

const CoinFlipModal = () => {
  const { t } = useTranslation();
  const [flipping, setFlipping] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const { state, setCoinFlipStatus, startDraft } = useDraft();

  const blueTeamName = state.teamNames?.blue || 'Blue';
  const redTeamName = state.teamNames?.red || 'Red';
  const show = state.coinFlipInProgress;
  const isAdmin = state.userTeam === 'admin';
  const globalResult = state.coinFlipResult;

  // Stili per la moneta
  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    color: 'white',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const coinContainerStyle = {
    textAlign: 'center',
    perspective: '1000px',
  };

  const coinStyle = {
    width: '300px',
    height: '300px',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 1.5s',
    borderRadius: '50%',
    border: '5px solid gold',
    background: 'linear-gradient(135deg, rgba(231,197,6,1) 0%, rgba(232,157,6,1) 100%)',
    boxShadow: '0 0 20px rgba(255,215,0,0.5)'
  };

  const coinFaceStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    borderRadius: '50%'
  };

  const blueFaceStyle = {
    ...coinFaceStyle,
    backgroundColor: '#1d3259',
    transform: 'rotateY(0deg)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const redFaceStyle = {
    ...coinFaceStyle,
    backgroundColor: '#482726',
    transform: 'rotateY(180deg)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  // Funzione per eseguire il lancio della moneta (solo per admin)
  const performCoinFlip = () => {
    if (!isAdmin) return;
    
    //console.log("Admin: eseguo coin flip");
    setFlipping(true);
    setAnimationComplete(false);

    // Durata dell'animazione: 1.5 secondi
    setTimeout(() => {
      // Genera risultato casuale
      const randomValue = Math.random();
      //console.log("Valore casuale generato:", randomValue);
      
      const result = randomValue < 0.5 ? 'blue' : 'red';
      //console.log("Admin: risultato del lancio:", result);
      setLocalResult(result);
      setAnimationComplete(true);
      
      // Invia il risultato a Firebase immediatamente
      // ma NON avviare ancora il draft (solo il risultato, non shouldStartDraft)
      setCoinFlipStatus(true, result);
      
      // Mostriamo il risultato per 4 secondi prima di avviare il draft
      setTimeout(() => {
        //console.log("Admin: Attesa di 4 secondi completata, avvio il draft");
        // Aggiorna lo stato in Firebase per avviare il draft
        startDraft(result);
      }, 4000); // Ritardo di 4 secondi prima di avviare il draft
    }, 1500); // Durata dell'animazione della moneta
  };

  // Effetto per sincronizzare l'animazione tra i client
  useEffect(() => {
    if (show && globalResult && !flipping) {
      //console.log(`Client ${state.userTeam}: Inizio animazione coin flip con risultato:`, globalResult);
      
      // Avvia l'animazione
      setFlipping(true);
      setAnimationComplete(false);
      
      // Dopo 1.5 secondi, mostra il risultato
      setTimeout(() => {
        //console.log(`Client ${state.userTeam}: Completata animazione, mostro risultato:`, globalResult);
        setLocalResult(globalResult);
        setAnimationComplete(true);
      }, 1500);
    }
  }, [show, globalResult, flipping, state.userTeam]);

  // Avvia automaticamente il coin flip quando la modale appare
  useEffect(() => {
    if (show && isAdmin && !flipping && !localResult && !globalResult) {
      //console.log("Admin: avvio automatico del coin flip");
      // Piccolo ritardo per assicurarsi che la modale sia visibile
      setTimeout(() => {
        performCoinFlip();
      }, 300);
    }
  }, [show, isAdmin, flipping, localResult, globalResult]);

  // Debug useEffect
  useEffect(() => {
    /*console.log("CoinFlipModal stato:", {
      show,
      flipping,
      localResult, 
      globalResult,
      animationComplete
    });*/
  }, [show, flipping, localResult, globalResult, animationComplete]);

  // Se la modale non è mostrata, non renderizzare nulla
  if (!show) {
    return null;
  }

  // Determina il risultato effettivo da utilizzare
  const effectiveResult = localResult || globalResult;

  return (
    <div style={modalStyle}>
      <div style={coinContainerStyle}>
        <h2 style={{ marginBottom: '20px', color: 'gold' }}>{t('coinflip.name', 'Coin Flip')}</h2>
        
        <div 
          style={{
            ...coinStyle,
            // CORREZIONE QUI: inverto la logica dell'animazione
            // Se il risultato è 'red', mostra la faccia rossa (900deg)
            // Se il risultato è 'blue', mostra la faccia blu (720deg)
            transform: flipping 
              ? (effectiveResult === 'red'
                ? 'rotateY(900deg)' 
                : 'rotateY(720deg)') 
              : 'rotateY(0deg)'
          }}
        >
          <div style={blueFaceStyle}>
            <span style={{ fontSize: '1.5rem' }}>{blueTeamName}</span>
            <span style={{ fontSize: '1rem', opacity: 0.7 }}>Team</span>
          </div>
          <div style={redFaceStyle}>
            <span style={{ fontSize: '1.5rem' }}>{redTeamName}</span>
            <span style={{ fontSize: '1rem', opacity: 0.7 }}>Team</span>
          </div>
        </div>
        
        {effectiveResult && animationComplete && (
          <div 
            style={{
              marginTop: '20px',
              fontSize: '1.5rem',
              // CORREZIONE QUI: uso direttamente effectiveResult per determinare il colore
              color: effectiveResult === 'blue' ? '#2962ff' : '#ff4f00'
            }}
          >
            {effectiveResult === 'blue'
              ? `${blueTeamName} Team ${t('coinflip.wins', 'WINS')}!` 
              : `${redTeamName} Team ${t('coinflip.wins', 'WINS')}!`}
          </div>
        )}
        
        {!flipping && !animationComplete && (
          <p style={{ marginTop: '20px', color: 'gold' }}>
            {t('coinflip.launching', 'Launching the coin...')}
          </p>
        )}
        
        {!isAdmin && !animationComplete && flipping && (
          <p style={{ marginTop: '20px', color: 'gold' }}>
            {t('coinflip.flipping', 'Flipping the coin...')}
          </p>
        )}
        
        {!isAdmin && animationComplete && (
          <p style={{ marginTop: '20px', color: 'gold' }}>
            {t('coinflip.resultWillStart', 'Draft will start in a moment...')}
          </p>
        )}
      </div>
    </div>
  );
};

export default CoinFlipModal;