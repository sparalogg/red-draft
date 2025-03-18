import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../../context/DraftContext';
import { useChampions } from '../../hooks/useChampions';

/**
 * PickSlot component for displaying a team's champion selection slot
 */
const PickSlot = ({ team, slotNumber, isActive }) => {
  const { t } = useTranslation();
  const { state } = useDraft();
  const { champions } = useChampions();
  
  // Create the slot ID matching the format used in the draft sequence
  const slotId = `${team}Player${slotNumber}`;
  
  // Verifica se questo slot è specificato nel currentStep o additionalSlots
  const currentStep = state.draftSequence[state.currentStepIndex] || {};
  const isCurrentSlot = currentStep.slot === slotId || 
                       (currentStep.additionalSlots && currentStep.additionalSlots.includes(slotId));
  
  // Combina isActive con isCurrentSlot
  const isActiveSlot = isActive && isCurrentSlot;
  
  // Otteniamo l'ID del campione selezionato per questo slot
  const championId = state.slotSelections && state.slotSelections[slotId];
  const isSelected = !!championId;
  
  // Ottiene il campione dal suo ID
  const getChampionById = (championId) => {
    return champions.find(champ => champ.id.toString() === championId.toString());
  };
  
  // Ottiene le informazioni del campione selezionato
  let championInfo = null;
  if (isSelected && championId) {
    const champion = getChampionById(championId);
    if (champion) {
      championInfo = {
        id: champion.id,
        name: champion.name,
        image: champion.image
      };
    }
  }
  
  // Fix the image path
  const getImagePath = (imagePath) => {
    if (!imagePath) return null;
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  };
  
  // CSS classes
  const slotClasses = [
    'player-slot',
    isActiveSlot ? 'active' : '',
    isSelected ? 'selected' : ''
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      id={slotId}
      className={slotClasses}
    >
      {isSelected && championInfo ? (
        <>
          {championInfo.image ? (
            <img src={getImagePath(championInfo.image)} alt={championInfo.name} />
          ) : (
            <i className="fa-solid fa-user-ninja"></i>
          )}
          <div className="hero-name">{championInfo.name}</div>
        </>
      ) : (
        <>
          <span>Slot Player</span>
        </>
      )}
    </div>
  );
};

export default PickSlot;