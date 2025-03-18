export function generateDraftSequence({
  numberOfBans,
  teamNames,
  startingTeam = null
}) {
  /*console.log('Generazione sequenza draft:', {
    numberOfBans,
    teamNames,
    startingTeam
  });*/

  // Se non è specificato un team iniziale, usa il lancio moneta
  if (!startingTeam) {
    startingTeam = Math.random() < 0.5 ? 'blue' : 'red';
  }

  // Se startingTeam è 'red', inverti completamente la sequenza standard
  const isReversed = startingTeam === 'red';

  // Definisci la sequenza base per i ban
  const createBanSequence = (team1, team2) => {
    let banSequence = [];
    
    // Determina il numero di ban per fase
    let firstBanCount = 0;
    let secondBanCount = 0;

    switch (parseInt(numberOfBans)) {
      case 1:
        firstBanCount = 1;
        secondBanCount = 0;
        break;
      case 2:
        firstBanCount = 1;
        secondBanCount = 1;
        break;
      case 3:
        firstBanCount = 1;
        secondBanCount = 2;
        break;
      case 4:
        firstBanCount = 2;
        secondBanCount = 2;
        break;
      default:
        firstBanCount = 1;
        secondBanCount = 1;
    }

    // Prima fase di ban
    if (firstBanCount === 1) {
      banSequence.push(
        {
          type: 'ban',
          team: team1,
          slot: `${team1}Ban1`,
          phase: `Ban - ${teamNames[team1]} Team`,
          multiSelect: false,
          selectCount: 1
        },
        {
          type: 'ban',
          team: team2,
          slot: `${team2}Ban1`,
          phase: `Ban - ${teamNames[team2]} Team`,
          multiSelect: false,
          selectCount: 1
        }
      );
    } else if (firstBanCount === 2) {
      banSequence.push(
        {
          type: 'ban',
          team: team1,
          slot: `${team1}Ban1`,
          phase: `Ban (2) - ${teamNames[team1]} Team`,
          multiSelect: true,
          selectCount: 2,
          additionalSlots: [`${team1}Ban2`]
        },
        {
          type: 'ban',
          team: team2,
          slot: `${team2}Ban1`,
          phase: `Ban (2) - ${teamNames[team2]} Team`,
          multiSelect: true,
          selectCount: 2,
          additionalSlots: [`${team2}Ban2`]
        }
      );
    }

    return banSequence;
  };

  // Funzione per creare la sequenza di pick
  const createPickSequence = (team1, team2) => {
    return [
      // Blue seleziona primo eroe
      {
        type: 'pick',
        team: team1,
        slot: `${team1}Player1`,
        phase: `Pick - ${teamNames[team1]} Team`,
        multiSelect: false,
        selectCount: 1
      },
      // Red seleziona due eroi
      {
        type: 'pick',
        team: team2,
        slot: `${team2}Player1`,
        phase: `Pick (2) - ${teamNames[team2]} Team`,
        multiSelect: true,
        selectCount: 2,
        additionalSlots: [`${team2}Player2`]
      },
      // Blue seleziona due eroi
      {
        type: 'pick',
        team: team1,
        slot: `${team1}Player2`,
        phase: `Pick (2) - ${teamNames[team1]} Team`,
        multiSelect: true,
        selectCount: 2,
        additionalSlots: [`${team1}Player3`]
      },
      // Red seleziona un eroe
      {
        type: 'pick',
        team: team2,
        slot: `${team2}Player3`,
        phase: `Pick - ${teamNames[team2]} Team`,
        multiSelect: false,
        selectCount: 1
      }
    ];
  };

  // Seconda fase di ban
  const createSecondBanSequence = (team1, team2) => {
    let secondBanSequence = [];
    
    let secondBanCount = 0;
    switch (parseInt(numberOfBans)) {
      case 3: secondBanCount = 2; break;
      case 4: secondBanCount = 2; break;
      default: secondBanCount = 1;
    }

    if (secondBanCount === 1) {
      secondBanSequence.push(
        {
          type: 'ban',
          team: team2,
          slot: `${team2}Ban2`,
          phase: `Secondary Ban - ${teamNames[team2]} Team`,
          multiSelect: false,
          selectCount: 1
        },
        {
          type: 'ban',
          team: team1,
          slot: `${team1}Ban2`,
          phase: `Secondary Ban - ${teamNames[team1]} Team`,
          multiSelect: false,
          selectCount: 1
        }
      );
    } else if (secondBanCount === 2) {
      secondBanSequence.push(
        {
          type: 'ban',
          team: team2,
          slot: `${team2}Ban2`,
          phase: `Secondary Ban (2) - ${teamNames[team2]} Team`,
          multiSelect: true,
          selectCount: 2,
          additionalSlots: [`${team2}Ban3`]
        },
        {
          type: 'ban',
          team: team1,
          slot: `${team1}Ban2`,
          phase: `Secondary Ban (2) - ${teamNames[team1]} Team`,
          multiSelect: true,
          selectCount: 2,
          additionalSlots: [`${team1}Ban3`]
        }
      );
    }

    return secondBanSequence;
  };

  // Ultima fase di pick
  const createFinalPickSequence = (team1, team2) => {
    return [
      // Red seleziona un eroe
      {
        type: 'pick',
        team: team2,
        slot: `${team2}Player4`,
        phase: `Pick - ${teamNames[team2]} Team`,
        multiSelect: false,
        selectCount: 1
      },
      // Blue seleziona due eroi
      {
        type: 'pick',
        team: team1,
        slot: `${team1}Player4`,
        phase: `Pick (2) - ${teamNames[team1]} Team`,
        multiSelect: true,
        selectCount: 2,
        additionalSlots: [`${team1}Player5`]
      },
      // Red seleziona l'ultimo eroe
      {
        type: 'pick',
        team: team2,
        slot: `${team2}Player5`,
        phase: `Pick - ${teamNames[team2]} Team`,
        multiSelect: false,
        selectCount: 1
      }
    ];
  };

  // Determina l'ordine dei team
  const [team1, team2] = isReversed ? ['red', 'blue'] : ['blue', 'red'];

  // Costruisci la sequenza completa
  const sequence = [
    ...createBanSequence(team1, team2),
    ...createPickSequence(team1, team2),
    ...createSecondBanSequence(team1, team2),
    ...createFinalPickSequence(team1, team2)
  ];

  //console.log("Generated sequence:", sequence);
  return sequence;
}