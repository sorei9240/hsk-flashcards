import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Flashcard from './Flashcard';
import SessionSummary from './SessionSummary';
import type { Character, CharacterSet } from '../types';
import { 
  loadCharacterData, 
  filterByLevel, 
  getCardContent, 
  loadPreferences
} from '../services/dataService';

const FlashcardSession: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [studyMode, setStudyMode] = useState<'ChineseToEnglish' | 'EnglishToChinese'>('ChineseToEnglish');
  const [characterSet, setCharacterSet] = useState<CharacterSet>('simplified');
  const [history, setHistory] = useState<number[]>([]); // For backtracking (IH#5)
  const [showModeSelector, setShowModeSelector] = useState<boolean>(false);
  
  // get character data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const prefs = loadPreferences();
      setStudyMode(prefs.studyMode);
      setCharacterSet(prefs.characterSet);
      
      const allCharacters = await loadCharacterData();
      const filteredCharacters = filterByLevel(allCharacters, prefs.level);
      
      // Shuffle the cards
      const shuffled = [...filteredCharacters].sort(() => 0.5 - Math.random());
      
      // Limit to 20 cards for now
      const sessionCards = shuffled.slice(0, 20);
      
      setCharacters(sessionCards);
      setLoading(false);
    };
    
    loadData();
  }, []);
  
  // Handle going back to previous card
  const handlePrevious = () => {
    if (history.length === 0) return;
    const prevIndex = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    setCurrentIndex(prevIndex);
  };
  
  // Handle moving to next card
  const handleNext = () => {
    if (currentIndex >= characters.length - 1) {
      setShowSummary(true);
    } else {
      setHistory(prev => [...prev, currentIndex]);
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  // Handle session ending
  const handleEndSession = () => {
    navigate('/');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }
  
  if (showSummary) {
    return (
      <SessionSummary 
        totalCards={characters.length}
        onGoHome={handleEndSession}
      />
    );
  }
  
  if (characters.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">No Flashcards Found</h2>
          <p className="text-gray-600 mb-4">
            We couldn't find any flashcards for the selected HSK level. 
            Please try a different level.
          </p>
          <button
            onClick={handleEndSession}
            className="bg-primary hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  const currentChar = characters[currentIndex];
  
  // Get content for card based on mode
  const cardContent = (() => {
    const content = getCardContent(currentChar, characterSet);
    
    if (studyMode === 'ChineseToEnglish') {
      return {
        front: content.front,
        back: {
          character: content.front, 
          pinyin: content.back.pinyin,
          meanings: content.back.meanings
        }
      };
    } else {
      // English to Chinese mode (reversed)
      return {
        front: content.back.meanings[0], 
        back: {
          character: content.front, 
          pinyin: content.back.pinyin, 
          meanings: [] 
        }
      };
    }
  })();
  
  // Check if we're on the last card
  const isLastCard = currentIndex === characters.length - 1;
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
      {/* Study mode selector  */}
      {showModeSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full relative z-50">
              <h3 className="text-xl font-bold mb-4">Which way would you like to study?</h3>
              <div className="space-y-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStudyMode('ChineseToEnglish');
                    setShowModeSelector(false);
                  }}
                  className={`w-full text-left p-3 border rounded-md hover:bg-gray-100 ${
                    studyMode === 'ChineseToEnglish' ? 'bg-gray-100 border-primary' : ''
                  }`}
                >
                  Chinese → English
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStudyMode('EnglishToChinese');
                    setShowModeSelector(false);
                  }}
                  className={`w-full text-left p-3 border rounded-md hover:bg-gray-100 ${
                    studyMode === 'EnglishToChinese' ? 'bg-gray-100 border-primary' : ''
                  }`}
                >
                  English → Chinese
                </button>
              </div>
            </div>
            <div 
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowModeSelector(false)}
            ></div>
          </div>
        )}
        
        {/* Mode switch button */}
        <div className="mb-4 flex justify-end">
          <button 
            onClick={() => setShowModeSelector(true)}
            className="text-sm text-primary hover:text-blue-700 flex items-center"
          >
            <span className="mr-1">↻</span>
            Switch to {studyMode === 'ChineseToEnglish' ? 'English → Chinese' : 'Chinese → English'} Mode
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="mb-4 flex justify-between items-center text-sm text-gray-600">
          <span>Card {currentIndex + 1} of {characters.length}</span>
          
          {/* Finish button*/}
          {isLastCard && (
            <button
              onClick={() => setShowSummary(true)}
              className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md"
            >
              Finish
            </button>
          )}
        </div>
        
        {/* Flashcard */}
        <Flashcard
          front={cardContent.front}
          back={cardContent.back}
          onEndSession={handleEndSession}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
          onNext={!isLastCard ? handleNext : undefined}
        />
        
        {/* Finish button*/}
        {isLastCard && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowSummary(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors duration-200"
            >
              Complete Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardSession;