import React from 'react';
import { useDraft } from '../../context/DraftContext';

const BonusTimeDisplay = () => {
  const { state } = useDraft();
  
  const blueBonusTime = state.teamBonusTime?.blue || 0;
  const redBonusTime = state.teamBonusTime?.red || 0;
  
  const isUsingBonusTimeBlue = state.isUsingBonusTime?.blue;
  const isUsingBonusTimeRed = state.isUsingBonusTime?.red;

  // Funzione per rendere il display del tempo bonus
  const renderBonusTimeDisplay = (team, bonusTime, isUsingBonusTime) => {
    const containerClasses = [
      'team-bonus', 
      team === 'blue' ? 'blue-bonus' : 'red-bonus',
      isUsingBonusTime && bonusTime > 0 ? 'using-bonus-time' : ''
    ].filter(Boolean).join(' ');

    return (
      <div className={containerClasses}>
        <span className="bonus-label">Bonus {team === 'blue' ? 'Blue' : 'Red'}:</span>
        <span className="bonus-time">
          {bonusTime} secondi 
          {isUsingBonusTime && bonusTime > 0 && <span> (Bonus Time Active)</span>}
          {isUsingBonusTime && bonusTime === 0 && <span> (Bonus Time Expired)</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="team-bonus-container">
      {renderBonusTimeDisplay('blue', blueBonusTime, isUsingBonusTimeBlue)}
      {renderBonusTimeDisplay('red', redBonusTime, isUsingBonusTimeRed)}
    </div>
  );
};

export default BonusTimeDisplay;