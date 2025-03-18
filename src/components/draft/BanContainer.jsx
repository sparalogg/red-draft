import React from 'react';
import BanSlot from './BanSlot';

/**
 * BanContainer component for displaying a team's ban slots
 */
const BanContainer = ({ team, numberOfBans }) => {
  // Create an array of ban slot numbers
  const banSlots = Array.from({ length: numberOfBans }, (_, i) => i + 1);
  
  return (
    <div className="ban-container" id={`${team}BanContainer`}>
      {banSlots.map(slotNumber => (
        <BanSlot 
          key={slotNumber}
          team={team}
          slotNumber={slotNumber}
        />
      ))}
    </div>
  );
};

export default BanContainer;