import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CharacterSet } from '../types';
import { savePreferences, loadPreferences } from '../services/dataService';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<string>('new-1');
  const [characterSet, setCharacterSet] = useState<CharacterSet>('simplified');
  const [cardCount, setCardCount] = useState<number>(20);
  
  // Load saved preferences at start
  useEffect(() => {
    const prefs = loadPreferences();
    setLevel(prefs.level);
    setCharacterSet(prefs.characterSet);
    setCardCount(prefs.cardCount || 20);
  }, []);

  const handleStartSession = () => {
    // Save preferences before starting session
    savePreferences(level, characterSet, 'ChineseToEnglish', cardCount);
    navigate('/study');
  };

  const handleViewVocabulary = () => {
    savePreferences(level, characterSet, 'ChineseToEnglish', cardCount);
    navigate('/vocabulary');
  };

  const handleViewHelp = () => {
    navigate('/help');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6">
          字习 HSK Flashcards
        </h1>
        
        <div className="space-y-4 mb-6">
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label 
                htmlFor="level-select" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Deck: HSK Level
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
            
            <div className="w-1/2">
              <label 
                htmlFor="character-set" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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
          
          <div>
            <label 
              htmlFor="card-count" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Number of Cards to Review
            </label>
            <select
              id="card-count"
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
            >
              <option value={5}>5 cards (Quick review)</option>
              <option value={10}>10 cards</option>
              <option value={15}>15 cards</option>
              <option value={20}>20 cards (Default)</option>
              <option value={30}>30 cards</option>
              <option value={50}>50 cards (Long session)</option>
              <option value={100}>100 cards (Marathon)</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleStartSession}
            className="w-full bg-blue-700 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 flex items-center justify-center"
          >
            <span className="text-xl">Start Study Session ({cardCount} cards)</span>
          </button>
          
          <button
            onClick={handleViewVocabulary}
            className="w-full bg-blue-600 hover:bg-blue-400 text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 flex items-center justify-center"
          >
            <span className="text-xl">View Vocabulary List</span>
          </button>
        </div>
        
        <div className="flex justify-center mt-6">
          <button
            onClick={handleViewHelp}
            className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            <span className="mr-1">❓</span>
            Help
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;