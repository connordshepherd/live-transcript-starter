export type TranscriptEntry = {
    type: 'transcript';
    speaker: number;
    text: string;
    isUtteranceEnd?: boolean;
    lastWordEnd?: number;
  };