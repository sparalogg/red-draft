// draftStateMachine.js - File completamente nuovo
/**
 * Macchina a stati per gestire la sequenza di draft in modo affidabile
 */
// Crea il file utils/draftStateMachine.js con questo contenuto
export class DraftStateMachine {
    constructor(sequence, settings) {
      this.sequence = sequence;
      this.currentIndex = 0;
      this.settings = settings;
      this.status = 'waiting'; // waiting, in_progress, completed
    }
  
    // Ottiene lo stato corrente
    getCurrentState() {
      if (this.currentIndex >= this.sequence.length) {
        return {
          status: 'completed',
          phase: 'completed',
          team: null,
          selections: [],
          timer: 0
        };
      }
  
      const currentStep = this.sequence[this.currentIndex];
      return {
        status: 'in_progress',
        phase: currentStep.type,
        team: currentStep.team,
        slot: currentStep.slot,
        additionalSlots: currentStep.additionalSlots,
        isMultipleSelection: currentStep.multiSelect || false,
        requiredSelections: currentStep.selectCount || 1,
        phaseDescription: currentStep.phase,
        timer: currentStep.type === 'ban' ? this.settings.timePerBan : this.settings.timePerPick
      };
    }
  
    // Passa al prossimo stato
    advance() {
      this.currentIndex++;
      return this.getCurrentState();
    }
  
    // Resetta la macchina a stati
    reset() {
      this.currentIndex = 0;
      this.status = 'waiting';
      return this;
    }
  
    // Verifica se la sequenza è completata
    isCompleted() {
      return this.currentIndex >= this.sequence.length;
    }
  
    // Inizia la sequenza
    start() {
      this.status = 'in_progress';
      return this.getCurrentState();
    }
  }