import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PickSlot from './PickSlot';
import BanContainer from './BanContainer';
import { useDraft } from '../../context/DraftContext';

/**
 * TeamPanel component for displaying a team's selections
 */
const TeamPanel = ({ team }) => {
  const { t } = useTranslation();
  const { state } = useDraft();
  const lastPhaseRef = useRef(state.currentPhase);
  const lastResetTimestampRef = useRef(state.lastResetTimestamp || 0);
  
  // Forza un re-render completo quando cambia la fase o dopo un reset
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Monitora specificamente cambiamenti che richiedono un aggiornamento forzato
  useEffect(() => {
    // Se ci spostiamo a notStarted da qualsiasi altra fase, è probabilmente un reset
    if (state.currentPhase === 'notStarted' && lastPhaseRef.current !== 'notStarted') {
      //console.log(`TeamPanel ${team}: Rilevato cambio fase a notStarted, forzo aggiornamento`);
      setForceUpdate(prev => prev + 1);
    }
    
    // Se cambia il timestamp del reset, è sicuramente un reset
    if (state.lastResetTimestamp && state.lastResetTimestamp !== lastResetTimestampRef.current) {
      //console.log(`TeamPanel ${team}: Rilevato cambio timestamp reset, forzo aggiornamento`);
      setForceUpdate(prev => prev + 1);
    }
    
    // Aggiorna i riferimenti
    lastPhaseRef.current = state.currentPhase;
    lastResetTimestampRef.current = state.lastResetTimestamp || 0;
  }, [state.currentPhase, state.lastResetTimestamp, team]);
  
  // Is the current step for this team?
  const isActiveTeam = state.currentPhase !== 'notStarted' && 
                       state.currentPhase !== 'completed' && 
                       state.currentTeam === team;
  
  // Estrai esplicitamente i dati necessari (la dipendenza da forceUpdate garantisce l'aggiornamento)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    //console.log(`TeamPanel ${team}: Force update triggered: ${forceUpdate}`);
  }, [forceUpdate, team]);
  
  // Accesso diretto e sicuro alle proprietà evitando riferimenti nulli
  const selectedChampions = state.selectedChampions?.[team] || [];
  const bannedChampions = state.bannedChampions?.[team] || [];
  
  // Log per debug
  useEffect(() => {
    // Forza un re-render quando cambia resetId
    if (state.resetId) {
      //console.log(`TeamPanel ${team}: Reset ID cambiato: ${state.resetId}, forzo aggiornamento`);
      
      // Pulizia manuale dei contenuti DOM
      const panel = document.querySelector(`.team-panel.${team}`);
      if (panel) {
        // Trova tutti gli slot e resetta il contenuto delle immagini
        const slots = panel.querySelectorAll('.pick-slot, .ban-slot');
        slots.forEach(slot => {
          const img = slot.querySelector('img');
          if (img) {
            img.src = '';
            img.style.display = 'none';
          }
        });
      }
    }
  }, [state.resetId, team]);
  
  return (
    <div className={`team-panel ${team}-panel`} key={`panel-${team}-${forceUpdate}`}>
      {/* Player slots - Aggiunto key con forceUpdate per garantire un nuovo rendering */}
      {[1, 2, 3, 4, 5].map(slotNumber => (
        <PickSlot 
          key={`${team}-slot-${slotNumber}-${forceUpdate}`}
          team={team}
          slotNumber={slotNumber}
          isActive={isActiveTeam && 
                   state.currentStepIndex < (state.draftSequence?.length || 0) && 
                   state.draftSequence?.[state.currentStepIndex]?.slot === `${team}Player${slotNumber}`}
          // Passa esplicitamente lo slotSelection e forceUpdate come prop
          selection={state.slotSelections?.[`${team}Player${slotNumber}`] || null}
          forceUpdate={forceUpdate}
        />
      ))}
      
      {/* Ban slots - Aggiunto key con forceUpdate */}
      <BanContainer 
        key={`${team}-bans-${forceUpdate}`}
        team={team} 
        numberOfBans={parseInt(state.settings?.numberOfBans || 2)}
        // Passa esplicitamente bannedChampions e forceUpdate come prop
        bannedChampions={bannedChampions}
        forceUpdate={forceUpdate}
      />
    </div>
  );
};

export default TeamPanel;