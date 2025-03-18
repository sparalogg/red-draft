import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../../context/DraftContext';

const TeamHeader = ({ team, readOnly = false }) => {
  const { t } = useTranslation();
  const { state, updateTeamName } = useDraft();
  
  const [isEditing, setIsEditing] = useState(false);
  const [teamName, setTeamName] = useState(state.teamNames?.[team] || t(`teams.${team}`));

  // Effetto per sincronizzare il nome del team quando cambia nello stato globale
  useEffect(() => {
    const newTeamName = state.teamNames?.[team] || t(`teams.${team}`);
    if (newTeamName !== teamName) {
      setTeamName(newTeamName);
    }
  }, [state.teamNames, team, t]);

  const bonusTime = state.teamBonusTime?.[team] || 0;
  
  // Verifica se questo è il team iniziale
  const isStartingTeam = state.draftSequence && 
    state.draftSequence[0] && 
    state.draftSequence[0].team === team;

  // Determina se questo è il team attuale
  const isCurrentTeam = state.currentTeam === team;

  const handleDoubleClick = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };
  
  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
      if (teamName !== (state.teamNames?.[team] || t(`teams.${team}`))) {
        updateTeamName(team, teamName);
      }
    }
  };
  
  const handleChange = (e) => {
    setTeamName(e.target.value);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };
  
  // Componente per il tempo bonus
  const BonusTimeIndicator = () => {
    const bonusTime = state.teamBonusTime?.[team] || 0;
    const isUsingBonusTime = state.isUsingBonusTime?.[team] || false;
  
    // Mostra l'indicatore se:
    // 1. C'è tempo bonus rimanente, O
    // 2. Si sta utilizzando il bonus time (anche se a 0)
    //if (bonusTime > 0 || isUsingBonusTime) {
      return (
        <span 
          className={`bonus-time-indicator ${team}-bonus-time`}
          title={`Tempo bonus rimanente: ${bonusTime} secondi`}
        >
          <i className="fas fa-clock"></i>
          <small>{bonusTime}s</small>
        </span>
      );
    //}
    //return null;
  };

  // Badge del team iniziale
  const StartingTeamBadge = () => {
    if (!isStartingTeam) return null;
    
    return (
      <span 
        className="starting-team-badge" 
        title="Team iniziale"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'gold',
          fontSize: '1.2rem'
        }}
      >
        <i className="fa-brands fa-square-web-awesome"></i>
      </span>
    );
  };

  const CurrentTurnBadge = () => {
    if (!isCurrentTeam) return null;
    
    return (
      <span className="current-turn-badge">
        <i className="fas fa-chess-knight"></i>
      </span>
    );
  };
  
  if (readOnly || !isEditing) {
    return (
      <div 
        className={`team-header ${team}-header`}
        onDoubleClick={handleDoubleClick}
        title={readOnly ? "" : "Doppio click per modificare"}
        style={{ position: 'relative' }}
      >
        <StartingTeamBadge />
        <CurrentTurnBadge />
        {teamName}
        <BonusTimeIndicator />
      </div>
    );
  }
  
  return (
    <input
      type="text"
      className={`team-header ${team}-header team-name-input`}
      value={teamName}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      autoFocus
      maxLength={20}
    />
  );
};

export default TeamHeader;