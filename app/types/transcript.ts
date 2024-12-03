export interface TranscriptEntry {
    speaker: number;
    text: string;
    isUtteranceEnd?: boolean;
    lastWordEnd?: number;
  }