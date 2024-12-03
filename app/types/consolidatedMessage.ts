export type ConsolidatedMessage = {
    type: 'consolidated';
    speaker: number;
    text: string;
    trigger: 'utterance_end' | 'speaker_change';
  };