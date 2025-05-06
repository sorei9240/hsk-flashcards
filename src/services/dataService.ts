import type { Character, CharacterSet } from '../types';

// Load all characters
export const loadCharacterData = async (): Promise<Character[]> => {
  try {
    const response = await fetch('/data/complete.json');
    if (!response.ok) {
      throw new Error('Failed to load character data');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading character data:', error);
    return [];
  }
};

// Filter by HSK level
export const filterByLevel = (characters: Character[], level: string): Character[] => {
  return characters.filter(char => char.level.includes(level));
};

// Get content based on character set preference
export const getCardContent = (
  character: Character,
  characterSet: CharacterSet
): {
  front: string;
  back: {
    character: string;
    pinyin: string;
    meanings: string[];
  };
} => {
  const frontChar = characterSet === 'simplified' 
    ? character.simplified 
    : character.forms[0].traditional;
  
  return {
    front: frontChar,
    back: {
      character: frontChar,
      pinyin: character.forms[0].transcriptions.pinyin,
      meanings: character.forms[0].meanings,
    }
  };
};

// User preferences storage
const PREFS_KEY = 'hsk_flashcard_preferences';

export const savePreferences = (
  level: string,
  characterSet: CharacterSet,
  studyMode: 'ChineseToEnglish' | 'EnglishToChinese'
): void => {
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({ level, characterSet, studyMode })
  );
};

export const loadPreferences = (): {
  level: string;
  characterSet: CharacterSet;
  studyMode: 'ChineseToEnglish' | 'EnglishToChinese';
} => {
  const defaultPrefs = {
    level: 'new-1',
    characterSet: 'simplified' as CharacterSet,
    studyMode: 'ChineseToEnglish' as const
  };
  
  const data = localStorage.getItem(PREFS_KEY);
  if (!data) return defaultPrefs;
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing preferences data:', error);
    return defaultPrefs;
  }
};