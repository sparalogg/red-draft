import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../../context/DraftContext';

/**
 * PhaseIndicator component to display the current draft phase
 */
const PhaseIndicator = () => {
  const { t } = useTranslation();
  const { state } = useDraft();

  // Get current phase text based on draft state
  const getPhaseText = () => {
    if (state.currentPhase === 'notStarted') {
      return t('draft.phase.waiting');
    }
    
    if (state.currentPhase === 'completed') {
      return t('draft.phase.completed');
    }
    
    if (state.isPaused) {
      return `${getCurrentStepText()} (${t('draft.phase.paused')})`;
    }
    
    return getCurrentStepText();
  };
  
  // Get text for the current step in the sequence
  const getCurrentStepText = () => {
    if (state.currentStepIndex >= state.draftSequence.length) {
      return t('draft.phase.completed');
    }
    
    const currentStep = state.draftSequence[state.currentStepIndex];
    
    // For multiple selection steps, show count
    if (state.isMultipleSelectionStep) {
      return `${currentStep.phase} (${state.currentSelections.length}/${state.requiredSelections})`;
    }
    
    return currentStep.phase;
  };
  
  return (
    <div className="phase-section">
      <div id="previewPhase">{getPhaseText()}</div>
    </div>
  );
};

export default PhaseIndicator;