import React, { useState, useEffect, useRef } from 'react';
import { useDraft } from '../../context/DraftContext';
import { useTranslation } from 'react-i18next';

const CoinFlipModal = () => {
  const { t } = useTranslation();
  const [flipping, setFlipping] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const draftStarted = useRef(false);
  const { state, setCoinFlipStatus, startDraft } = useDraft();

  const blueTeamName = state.teamNames?.blue || 'Blue';
  const redTeamName = state.teamNames?.red || 'Red';
  const show = state.coinFlipInProgress;
  const isAdmin = state.userTeam === 'admin';
  const globalResult = state.coinFlipResult;
  
  // Determina se l'utente corrente è il vincitore del coinflip
  const isWinningTeam = state.userTeam === globalResult;
  
  // Debug
  console.log("CoinFlipModal state:", {
    userTeam: state.userTeam,
    coinFlipResult: globalResult,
    isWinningTeam,
    animationComplete,
    startingTeamChoice: state.startingTeamChoice,
    show
  });

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

  const buttonStyle = {
    padding: '12px 24px',
    margin: '10px',
    borderRadius: '5px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: 'white',
    transition: 'transform 0.2s'
  };

  const firstButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2962ff',
    boxShadow: '0 4px 6px rgba(41, 98, 255, 0.3)'
  };

  const secondButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2962ff',
    boxShadow: '0 4px 6px rgba(41, 98, 255, 0.3)'
  };

  // Funzione per lanciare il coin flip
  const performCoinFlip = () => {
    if (!isAdmin) return;

    setFlipping(true);
    setAnimationComplete(false);

    setTimeout(() => {

      const timestamp = Date.now();
      const randomValue = Math.random();
      
      // Combiniamo timestamp e randomValue in modo semplice
      // Prendiamo l'ultimo bit del timestamp (pari/dispari) e lo XOR con un bit random
      const combinedRandom = ((timestamp % 2) ^ (randomValue >= 0.5 ? 1 : 0)) ? 0.7 : 0.3;
      
      // Determina il risultato finale con soglia 0.5
      const result = combinedRandom < 0.5 ? 'blue' : 'red';
        
        
        // Salva il risultato su Firebase
        setCoinFlipStatus(true, result, null);
        
        // Imposta animationComplete dopo il tempo di animazione
        setTimeout(() => {
            console.log("Animation complete, result:", result);
            setAnimationComplete(true);
        }, 300);
    }, 1500);
  };

  // Funzione per scegliere la posizione iniziale
  const chooseStartingPosition = (chosenTeam) => {
    console.log(`Scelta posizione: ${chosenTeam} sarà il team iniziale`);
    
    // Impedisci che la scelta venga fatta più volte
    if (state.startingTeamChoice) return;
    
    // Solo il team vincitore o l'admin possono fare la scelta
    if (!isWinningTeam && !isAdmin) return;
    
    // Aggiorna Firebase con la scelta
    setCoinFlipStatus(true, globalResult, chosenTeam);
  };

  // Gestisce l'animazione e l'inizializzazione del coinflip
  useEffect(() => {
    if (show && !flipping && !animationComplete) {
        if (isAdmin && !globalResult) {
            // Admin esegue il coinflip
            setTimeout(() => {
                performCoinFlip();
            }, 500);
        } else if (globalResult) {
            // Altri client sincronizzano l'animazione
            setFlipping(true);
            
            // Imposta animationComplete dopo l'animazione
            setTimeout(() => {
                console.log("Client animation complete");
                setAnimationComplete(true);
            }, 1700);
        }
    }
  }, [show, globalResult, flipping]);

  // Gestisce l'avvio del draft quando viene fatta una scelta
  useEffect(() => {
    // Se c'è una scelta iniziale e non abbiamo ancora avviato il draft
    if (state.startingTeamChoice && animationComplete && !draftStarted.current) {
        console.log("Scelta rilevata, avvio draft tra 3 secondi");
        
        // Imposta il flag per evitare avvii multipli
        draftStarted.current = true;
        
        // Avvia il draft dopo un ritardo
        setTimeout(() => {
            // Solo uno dei client (admin o vincitore) dovrebbe avviare effettivamente il draft
            if (isAdmin || isWinningTeam) {
                console.log("Avvio draft con team:", state.startingTeamChoice);
                startDraft(state.startingTeamChoice);
            }
        }, 3000);
    }
  }, [state.startingTeamChoice, animationComplete]);

  // Reset quando la modale si chiude
  useEffect(() => {
    if (!show) {
        draftStarted.current = false;
    }
  }, [show]);

  // Se la modale non è mostrata, non renderizzare nulla
  if (!show) {
    return null;
  }

  // Determina se mostrare i bottoni di scelta
  const shouldShowChoiceButtons = 
    animationComplete && 
    globalResult && 
    !state.startingTeamChoice && 
    (isWinningTeam || isAdmin);

  console.log("Should show choice buttons:", shouldShowChoiceButtons, {
    animationComplete, 
    globalResult, 
    startingTeamChoice: state.startingTeamChoice,
    isWinningTeam, 
    isAdmin
  });

  return (
    <div style={modalStyle}>
      <div style={coinContainerStyle}>
        <h2 style={{ marginBottom: '20px', color: 'gold' }}>{t('coinflip.name', 'Coin Flip')}</h2>
        
        <div 
          style={{
            ...coinStyle,
            transform: flipping 
              ? (globalResult === 'red'
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
        
        {globalResult && animationComplete && (
          <div 
            style={{
              marginTop: '20px',
              fontSize: '1.5rem',
              color: globalResult === 'blue' ? '#2962ff' : '#ff4f00'
            }}
          >
            {globalResult === 'blue'
              ? `${blueTeamName} Team ${t('coinflip.wins', 'WINS')}!` 
              : `${redTeamName} Team ${t('coinflip.wins', 'WINS')}!`}
          </div>
        )}
        
        {/* Mostra i bottoni di scelta SOLO se appropriato */}
        {shouldShowChoiceButtons && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ color: 'gold', marginBottom: '15px' }}>
              {isWinningTeam 
                ? t('coinflip.choosePosition', 'Choose your starting position:')
                : t('coinflip.adminChoose', 'Choose position for winning team:')}
            </p>
            <div>
              <button
                onClick={() => chooseStartingPosition(globalResult)}
                style={firstButtonStyle}
              >
                {t('coinflip.chooseFirst', 'Start First')}
              </button>
              <button
                onClick={() => chooseStartingPosition(globalResult === 'blue' ? 'red' : 'blue')}
                style={secondButtonStyle}
              >
                {t('coinflip.chooseSecond', 'Start Second')}
              </button>
            </div>
          </div>
        )}
        
        {/* Messaggi per gli altri stati */}
        {(!animationComplete || !globalResult) && (
          <p style={{ marginTop: '20px', color: 'gold' }}>
            {t('coinflip.flipping', 'Flipping the coin...')}
          </p>
        )}
        
        {animationComplete && globalResult && !shouldShowChoiceButtons && !state.startingTeamChoice && (
          <p style={{ marginTop: '20px', color: 'gold' }}>
            {t('coinflip.waitingForChoice', 'Waiting for winning team to choose...')}
          </p>
        )}
        
        {state.startingTeamChoice && (
          <p style={{ marginTop: '20px', color: 'gold' }}>
            {state.startingTeamChoice === 'blue'
              ? `${blueTeamName} ${t('coinflip.startsFirst', 'will start first!')}` 
              : `${redTeamName} ${t('coinflip.startsFirst', 'will start first!')}`}
          </p>
        )}
      </div>
    </div>
  );
};

export default CoinFlipModal;