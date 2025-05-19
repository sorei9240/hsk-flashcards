import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character, CharacterSet } from '../types';
import { loadCharacterData, filterByLevel } from '../services/dataService';

interface VocabularyItemProps {
  character: Character;
  characterSet: CharacterSet;
}

const VocabularyItem: React.FC<VocabularyItemProps> = ({ character, characterSet }) => {
  const charDisplay = characterSet === 'simplified' 
    ? character.simplified 
    : character.forms[0].traditional;

  return (
    <div className="border-b border-gray-200 py-3 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-baseline">
            <span className="text-xl font-medium text-gray-800 mr-3">{charDisplay}</span>
            <span className="text-sm text-gray-600">{character.forms[0].transcriptions.pinyin}</span>
          </div>
          <div className="mt-1 text-gray-800">
            {character.forms[0].meanings.join('; ')}
          </div>
        </div>
      </div>
    </div>
  );
};

const VocabularyList: React.FC = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filteredChars, setFilteredChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [level, setLevel] = useState<string>('new-1');
  const [characterSet, setCharacterSet] = useState<CharacterSet>('simplified');
  
  // Load character data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const allCharacters = await loadCharacterData();
      setCharacters(allCharacters);
      setFilteredChars(filterByLevel(allCharacters, level));
      setLoading(false);
    };
    
    loadData();
  }, []);
  
  // Filter by level
  useEffect(() => {
    if (characters.length === 0) return;
    
    const levelFiltered = filterByLevel(characters, level);
    setFilteredChars(levelFiltered);
  }, [level, characterSet, characters]);
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl">←</span>
          </button>
          <h2 className="text-2xl font-bold">Vocabulary List</h2>
        </div>
        
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="sm:w-1/2">
              <label htmlFor="level-select" className="block text-sm font-medium text-gray-700 mb-1">
                HSK Level
              </label>
              <select
                id="level-select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
              >
                <option value="new-1">HSK 1</option>
                <option value="new-2">HSK 2</option>
                <option value="new-3">HSK 3</option>
                <option value="new-4">HSK 4</option>
                <option value="new-5">HSK 5</option>
                <option value="new-6">HSK 6</option>
              </select>
            </div>
            
            <div className="sm:w-1/2">
              <label htmlFor="character-set" className="block text-sm font-medium text-gray-700 mb-1">
                Character Set
              </label>
              <select
                id="character-set"
                value={characterSet}
                onChange={(e) => setCharacterSet(e.target.value as CharacterSet)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
              >
                <option value="simplified">简体 Simplified</option>
                <option value="traditional">繁体 Traditional</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Vocabulary List */}
        <div className="border-t border-gray-200">
          {loading ? (
            <div className="py-8 text-center">
              <svg className="animate-spin h-8 w-8 text-blue-700 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading vocabulary...</p>
            </div>
          ) : filteredChars.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-600">No vocabulary items found.</p>
            </div>
          ) : (
            <div className="py-2 max-h-96 overflow-y-auto">
              {filteredChars.map((char, index) => (
                <VocabularyItem key={index} character={char} characterSet={characterSet} />
              ))}
              <div className="text-center text-sm text-gray-500 mt-4">
                Showing {filteredChars.length} vocabulary items
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocabularyList;