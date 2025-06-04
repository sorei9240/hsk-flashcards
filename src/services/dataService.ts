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

// Smart form selection to fix surname selection bug
const selectBestForm = (character: Character) => {
  // If there's only one form, use it
  if (character.forms.length === 1) {
    return character.forms[0];
  }
  
  // Look for a form that doesn't have "surname" as the primary meaning
  const nonSurnameForm = character.forms.find(form => {
    const primaryMeaning = form.meanings[0]?.toLowerCase() || '';
    return !primaryMeaning.includes('surname');
  });
  
  // If non-surname form is found, use it; otherwise fall back to first form
  return nonSurnameForm || character.forms[0];
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

  const selectedForm = selectBestForm(character);
  
  const frontChar = characterSet === 'simplified' 
    ? character.simplified 
    : selectedForm.traditional;
  
  return {
    front: frontChar,
    back: {
      character: frontChar,
      pinyin: selectedForm.transcriptions.pinyin,
      meanings: selectedForm.meanings,
    }
  };
};

// User preferences storage
const PREFS_KEY = 'hsk_flashcard_preferences';

export const savePreferences = (
  level: string,
  characterSet: CharacterSet,
  studyMode: 'ChineseToEnglish' | 'EnglishToChinese',
  cardCount?: number
): void => {
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({ level, characterSet, studyMode, cardCount })
  );
};

export const loadPreferences = (): {
  level: string;
  characterSet: CharacterSet;
  studyMode: 'ChineseToEnglish' | 'EnglishToChinese';
  cardCount: number;
} => {
  const defaultPrefs = {
    level: 'new-1',
    characterSet: 'simplified' as CharacterSet,
    studyMode: 'ChineseToEnglish' as const,
    cardCount: 20
  };
  
  const data = localStorage.getItem(PREFS_KEY);
  if (!data) return defaultPrefs;
  
  try {
    const parsed = JSON.parse(data);
    return {
      ...defaultPrefs,
      ...parsed
    };
  } catch (error) {
    console.error('Error parsing preferences data:', error);
    return defaultPrefs;
  }
};