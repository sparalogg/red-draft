// useTimerController.js
import { useEffect } from 'react';
import { timerService } from './timerService';

export function useTimerController(draftState, updateCallback) {
  useEffect(() => {
    // ID del timer univoco per la fase corrente
    const timerId = `draft-${draftState.draftId}-${draftState.currentPhase}-${draftState.currentStepIndex}`;
    
    const shouldRunTimer = 
      draftState.currentPhase !== 'notStarted' && 
      draftState.currentPhase !== 'completed' && 
      !draftState.isPaused;
    
    if (shouldRunTimer && draftState.expiryTimestamp) {
      // Calcola il tempo rimanente basato su expiryTimestamp
      const initialRemaining = timerService.getRemainingTime(draftState.expiryTimestamp);
      
      // Avvia il timer con il tempo rimanente
      timerService.startTimer(timerId, initialRemaining, (remaining) => {
        // Callback chiamato ogni secondo con il tempo rimanente
        updateCallback(remaining);
      });
    } else {
      // Ferma il timer se il draft è in pausa o completato
      timerService.stopTimer(timerId);
    }
    
    return () => {
      // Pulizia all'unmount
      timerService.stopTimer(timerId);
    };
  }, [
    draftState.draftId,
    draftState.currentPhase,
    draftState.currentStepIndex,
    draftState.isPaused,
    draftState.expiryTimestamp,
    updateCallback
  ]);
}