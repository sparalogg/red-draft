
// Nuova funzione modulare per generare la sequenza draft
export function generateDraftSequence({
  numberOfBans,
  teamNames,
  startingTeam = null
}) {
  // Determina il team vincente e perdente (winner/loser)
  // Se non specificato, random
  let winner = startingTeam;
  let loser = startingTeam === 'blue' ? 'red' : 'blue';
  if (!startingTeam) {
    winner = Math.random() < 0.5 ? 'blue' : 'red';
    loser = winner === 'blue' ? 'red' : 'blue';
  }

  // Helper per creare step
  const createStep = ({ type, team, slot, phase, multiSelect = false, selectCount = 1, additionalSlots = [] }) => ({
    type,
    team,
    slot,
    phase,
    multiSelect,
    selectCount,
    ...(additionalSlots.length > 0 ? { additionalSlots } : {})
  });

  let sequence = [];

  // --- LOGICA GENERICA PER 1, 2, 3, 4 BAN ---
  const bans = parseInt(numberOfBans);
  if (bans === 3) {
    // 3 BAN: sequenza custom robusta
    // Prima fase di ban: winner, loser, winner, loser
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban1`, phase: `Ban 1 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban1`, phase: `Ban 1 - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban2`, phase: `Ban 2 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban2`, phase: `Ban 2 - ${teamNames[loser]} (Loser)` })
    );
    // Prima fase pick: 1-2-2-1
    sequence.push(
      createStep({ type: 'pick', team: winner, slot: `${winner}Player1`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player1`, phase: `Pick (2) - ${teamNames[loser]} (Loser)`, multiSelect: true, selectCount: 2, additionalSlots: [`${loser}Player2`] }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player2`, phase: `Pick (2) - ${teamNames[winner]} (Winner)`, multiSelect: true, selectCount: 2, additionalSlots: [`${winner}Player3`] }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player3`, phase: `Pick - ${teamNames[loser]} (Loser)` })
    );
    // Seconda fase di ban: winner, loser
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban3`, phase: `Ban 3 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban3`, phase: `Ban 3 - ${teamNames[loser]} (Loser)` })
    );
    // Seconda fase pick: 1-2-1
    sequence.push(
      createStep({ type: 'pick', team: loser, slot: `${loser}Player4`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player4`, phase: `Pick (2) - ${teamNames[winner]} (Winner)`, multiSelect: true, selectCount: 2, additionalSlots: [`${winner}Player5`] }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player5`, phase: `Pick - ${teamNames[loser]} (Loser)` })
    );
    return sequence;
  }
  if (bans === 1) {
    // 1 BAN: solo una fase di ban (winner, loser), poi solo pick alternati (5 per team)
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban1`, phase: `Ban 1 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban1`, phase: `Ban 1 - ${teamNames[loser]} (Loser)` })
    );
    // Pick alternati: winner, loser, loser, winner, winner, loser, loser, winner, winner, loser
    sequence.push(
      createStep({ type: 'pick', team: winner, slot: `${winner}Player1`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player1`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player2`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player2`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player3`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player3`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player4`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player4`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player5`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player5`, phase: `Pick - ${teamNames[loser]} (Loser)` })
    );
    return sequence;
  }
  if (bans === 2) {
    // 2 BAN: due fasi di ban, in ciascuna winner e loser fanno 1 ban
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban1`, phase: `Ban 1 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban1`, phase: `Ban 1 - ${teamNames[loser]} (Loser)` })
    );
    // Pick alternati: winner, loser, loser, winner, winner, loser, loser, winner, winner, loser
    sequence.push(
      createStep({ type: 'pick', team: winner, slot: `${winner}Player1`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player1`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player2`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player2`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player3`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player3`, phase: `Pick - ${teamNames[loser]} (Loser)` })
    );
    // Seconda fase di ban
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban2`, phase: `Ban 2 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban2`, phase: `Ban 2 - ${teamNames[loser]} (Loser)` })
    );
    // Ultimi pick
    sequence.push(
      createStep({ type: 'pick', team: loser, slot: `${loser}Player4`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player4`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player5`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player5`, phase: `Pick - ${teamNames[loser]} (Loser)` })
    );
    return sequence;
  }
  if (bans === 4) {
    // 4 BAN: due fasi di ban, in ciascuna winner e loser fanno 2 ban alternati
    // Prima fase di ban
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban1`, phase: `Ban 1 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban1`, phase: `Ban 1 - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban2`, phase: `Ban 2 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban2`, phase: `Ban 2 - ${teamNames[loser]} (Loser)` })
    );
    // Pick alternati: winner, loser, loser, winner, winner, loser, loser, winner, winner, loser
    sequence.push(
      createStep({ type: 'pick', team: winner, slot: `${winner}Player1`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player1`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player2`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player2`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player3`, phase: `Pick - ${teamNames[winner]} (Winner)` })
    );
    // Seconda fase di ban
    sequence.push(
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban3`, phase: `Ban 3 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban3`, phase: `Ban 3 - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'ban', team: winner, slot: `${winner}Ban4`, phase: `Ban 4 - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'ban', team: loser, slot: `${loser}Ban4`, phase: `Ban 4 - ${teamNames[loser]} (Loser)` })
    );
    // Ultimi pick
    sequence.push(
      createStep({ type: 'pick', team: loser, slot: `${loser}Player3`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player4`, phase: `Pick - ${teamNames[loser]} (Loser)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player4`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: winner, slot: `${winner}Player5`, phase: `Pick - ${teamNames[winner]} (Winner)` }),
      createStep({ type: 'pick', team: loser, slot: `${loser}Player5`, phase: `Pick - ${teamNames[loser]} (Loser)` })
    );
    return sequence;
  }

  // Fallback: sequenza base
  sequence.push(
    createStep({ type: 'ban', team: 'blue', slot: `blueBan1`, phase: `Ban 1 - ${teamNames['blue']}` }),
    createStep({ type: 'ban', team: 'red', slot: `redBan1`, phase: `Ban 1 - ${teamNames['red']}` }),
    createStep({ type: 'pick', team: 'blue', slot: `bluePlayer1`, phase: `Pick 1 - ${teamNames['blue']}` }),
    createStep({ type: 'pick', team: 'red', slot: `redPlayer1`, phase: `Pick 1 - ${teamNames['red']}` })
  );
  return sequence;
}
