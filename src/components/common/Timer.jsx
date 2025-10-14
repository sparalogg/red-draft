import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../../context/DraftContext';
import { useTimer } from '../../hooks/useTimer';

const Timer = () => {
  const { t } = useTranslation();
  const { state } = useDraft();
  const { currentTimer } = useTimer();
  
  // Determina il tipo di fase corrente (pick o ban)
  const getCurrentPhaseType = () => {
    if (state.currentPhase === 'notStarted') return 'waiting';
    if (state.currentPhase === 'completed') return 'completed';
    
    return state.draftSequence[state.currentStepIndex]?.type || 'unknown';
  };
  
  const phaseType = getCurrentPhaseType();
  
  // Modifica la funzione getTimerClasses per includere la classe 'completed'
  const getTimerClasses = () => {
    const baseClass = 'timer-header';
    let teamClass = '';
    if (state.currentPhase !== 'completed' && state.currentPhase !== 'notStarted') {
      teamClass = state.currentTeam === 'blue' ? 'team-blue' : (state.currentTeam === 'red' ? 'team-red' : '');
    }
    if (phaseType === 'completed') {
      return `${baseClass} completed`;
    }
    if (currentTimer <= 5) {
      return `${baseClass} danger ${teamClass}`;
    } else if (currentTimer <= 10) {
      return `${baseClass} warning ${teamClass}`;
    }
    return `${baseClass} ${teamClass}`;
  };

  return (
    <div id="timer" className={getTimerClasses()}>
      <div className="timer-content">
        <i className={`fa-solid fa-clock me-2 team-${state.currentTeam}`}></i>
        {phaseType === 'ban' ? (
          <span className={`ban-pick-text team-${state.currentTeam}`}>
            Ban: {t('draft.timer', { seconds: currentTimer })}
          </span>
        ) : phaseType === 'pick' ? (
          <span className={`ban-pick-text team-${state.currentTeam}`}>
            Pick: {t('draft.timer', { seconds: currentTimer })}
          </span>
        ) : (
          <span>{t(`draft.phase.${phaseType}`)}</span>
        )}
      </div>
    </div>
  );
};

export default Timer;