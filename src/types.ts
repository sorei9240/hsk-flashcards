export interface Transcriptions {
  pinyin: string;
  numeric: string;
  wadegiles: string;
  bopomofo: string;
  romatzyh: string;
}

export interface CharacterForm {
  traditional: string;
  transcriptions: Transcriptions;
  meanings: string[];
  classifiers?: string[];
}

export interface Character {
  simplified: string;
  radical: string;
  level: string[];
  frequency: number;
  pos: string[];
  forms: CharacterForm[];
}

export type CharacterSet = 'simplified' | 'traditional';

export interface UserPreferences {
  level: string;
  characterSet: CharacterSet;
  studyMode: 'ChineseToEnglish' | 'EnglishToChinese';
}

export interface CardProgress {
  characterId: string; // simplified character as ID
  correctCount: number;
  incorrectCount: number;
  lastReviewed: number; // timestamp
}

export interface SessionStats {
  totalReviewed: number;
  correctCount: number;
  incorrectCount: number;
  newCards: number;
}