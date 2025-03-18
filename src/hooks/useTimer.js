import { useEffect, useRef } from 'react';
import { useDraft } from '../context/DraftContext';
import { useChampions } from './useChampions';

/**
 * Custom hook per gestire il timer del draft
 * Gestisce il countdown, il tempo bonus e la selezione automatica
 */
export function useTimer() {
  const { state, updateTimer, autoSelectChampion, isChampionSelectable } = useDraft();
  const { champions } = useChampions();
  const intervalRef = useRef(null);
  
  useEffect(() => {
    // Condizioni per non avviare il timer
    const shouldNotStartTimer = 
      state.currentPhase === 'notStarted' || 
      state.currentPhase === 'completed' || 
      state.isPaused;

    // Se non dovrebbe partire il timer, esci
    if (shouldNotStartTimer) return;

    intervalRef.current = setInterval(() => {
      /*console.log('Timer Tick:', {
        currentTimer: state.currentTimer,
        currentTeam: state.currentTeam,
        bonusTime: state.teamBonusTime[state.currentTeam],
        isUsingBonusTime: state.isUsingBonusTime?.[state.currentTeam]
      });*/

      // Aggiorna sempre il timer
      updateTimer();

      // Verifica se tutto il tempo è esaurito
      const currentTeam = state.currentTeam;
      const isUsingBonusTime = state.isUsingBonusTime?.[currentTeam] || false;
      const remainingBonusTime = state.teamBonusTime?.[currentTeam] || 0;

      // Selezione automatica solo se tutto il tempo è esaurito
      if (state.currentTimer <= 0 && !isUsingBonusTime && remainingBonusTime <= 0) {
        //console.log('Preparing auto-select due to complete time expiration');
        clearInterval(intervalRef.current);
        
        const availableChampions = champions.filter(champion => {
          const isReusable = champion.isReusable || champion.id === 'empty';
          return isReusable || isChampionSelectable(champion.id, isReusable);
        });
        
        autoSelectChampion(availableChampions);
      }
    }, 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    state.currentPhase, 
    state.isPaused, 
    state.currentTimer, 
    state.currentTeam,
    state.teamBonusTime,
    state.isUsingBonusTime,
    updateTimer, 
    autoSelectChampion,
    champions,
    isChampionSelectable
  ]);

  return {
    currentTimer: state.currentTimer,
    isPaused: state.isPaused
  };
}