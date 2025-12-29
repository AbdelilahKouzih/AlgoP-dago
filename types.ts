
export type DataType = 'entier' | 'réel' | 'chaîne de caractères' | 'chaine de caractères' | 'caractère' | 'booléen';

export interface Variable {
  name: string;
  type: DataType;
  value: any;
  isConstant: boolean;
}

export type InstructionType = 
  | 'ECRIRE' 
  | 'LIRE' 
  | 'AFFECTATION' 
  | 'SI' 
  | 'SINON' 
  | 'FIN_SI' 
  | 'DEBUT' 
  | 'FIN';

export interface Instruction {
  type: InstructionType;
  content: string;
  lineNumber: number;
  raw: string;
}

export interface ConsoleMessage {
  type: 'output' | 'error' | 'input' | 'system';
  text: string;
  timestamp: Date;
}

export interface ProgramState {
  variables: Map<string, Variable>;
  console: ConsoleMessage[];
  currentLine: number;
  instructionIndex: number;
  isRunning: boolean;
  isPausedForInput: boolean;
  inputTarget: string | null;
  inputBuffer: string[];
}

// Interface for algorithmic quality evaluation
export interface QualityScore {
  score: number;
  syntax: 'correct' | 'minor' | 'incorrect';
  logic: 'correct' | 'partial' | 'incorrect';
  readability: 'very_readable' | 'readable' | 'not_readable';
  feedback: string[];
}
