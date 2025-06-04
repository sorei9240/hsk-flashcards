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
import { 
  checkReviewServiceHealth, 
  generateCardId,
  getCardProgress,
  type CardProgress 
} from '../services/reviewService';
import { 
  checkAudioServiceHealth,
  preloadAudio,
  extractChineseText 
} from '../services/audioService';

interface SessionStats {
  totalCards: number;
  cardsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  averageResponseTime: number;
}

const FlashcardSession: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [studyMode, setStudyMode] = useState<'ChineseToEnglish' | 'EnglishToChinese'>('ChineseToEnglish');
  const [characterSet, setCharacterSet] = useState<CharacterSet>('simplified');
  const [history, setHistory] = useState<number[]>([]);
  const [showModeSelector, setShowModeSelector] = useState<boolean>(false);
  const [reviewServiceConnected, setReviewServiceConnected] = useState<boolean>(false);
  const [audioServiceConnected, setAudioServiceConnected] = useState<boolean>(false);
  const [preloadEnabled, setPreloadEnabled] = useState<boolean>(true);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalCards: 0,
    cardsReviewed: 0,
    correctCount: 0,
    incorrectCount: 0,
    averageResponseTime: 0
  });
  
  // Track graded cards at session level
  const [gradedCards, setGradedCards] = useState<Map<string, boolean>>(new Map());
  
  // Check review service connection
  useEffect(() => {
    const checkConnection = async () => {
      const isHealthy = await checkReviewServiceHealth();
      setReviewServiceConnected(isHealthy);
      
      if (!isHealthy) {
        console.warn('Review service is not available. Grading features will be limited.');
      }
    };
    
    checkConnection();
  }, []);
  
  // Check audio service connection
  useEffect(() => {
    const checkAudioConnection = async () => {
      const isHealthy = await checkAudioServiceHealth();
      setAudioServiceConnected(isHealthy);
      
      if (!isHealthy) {
        console.warn('Audio service is not available. Pronunciation features will be disabled.');
      }
    };
    
    checkAudioConnection();
  }, []);
  
  // Load character data AND previously graded cards
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const prefs = loadPreferences();
      setStudyMode(prefs.studyMode);
      setCharacterSet(prefs.characterSet);
      
      const allCharacters = await loadCharacterData();
      const filteredCharacters = filterByLevel(allCharacters, prefs.level);
      const shuffled = [...filteredCharacters].sort(() => 0.5 - Math.random());
      
      const cardCount = prefs.cardCount || 20;
      const sessionCards = shuffled.slice(0, Math.min(cardCount, filteredCharacters.length));
      
      setCharacters(sessionCards);
      setSessionStats(prev => ({
        ...prev,
        totalCards: sessionCards.length
      }));
      
      // Load previously graded cards from microservice
      if (reviewServiceConnected) {
        try {
          const previouslyGradedMap = new Map<string, boolean>();
          
          for (const char of sessionCards) {
            const cardId = generateCardId(char, prefs.characterSet);
            try {
              const progress = await getCardProgress(cardId);
              if (progress.totalReviews > 0) {
                const isCorrect = progress.correctReviews > (progress.totalReviews / 2);
                previouslyGradedMap.set(cardId, isCorrect);
              }
            } catch (error) {
              console.log(`No previous data for card ${cardId}`);
            }
          }
          
          setGradedCards(previouslyGradedMap);
          console.log(`Loaded ${previouslyGradedMap.size} previously graded cards`);
        } catch (error) {
          console.error('Error loading previous grades:', error);
        }
      }
      
      // Initial audio preload for first 5 cards 
      if (audioServiceConnected && preloadEnabled && sessionCards.length > 1) {
        try {
          const textsToPreload = sessionCards.slice(0, 5).map(char => {
            return extractChineseText(char, prefs.characterSet) || char.simplified;
          }).filter(Boolean);
          
          if (textsToPreload.length > 0) {
            console.log('Preloading audio for upcoming cards...');
            preloadAudio(textsToPreload).catch(error => {
              console.error('Initial preload failed:', error);
            });
          }
        } catch (error) {
          console.error('Error setting up initial preload:', error);
        }
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [reviewServiceConnected, audioServiceConnected]);
  
  // Preload audio for next cards when advancing
  useEffect(() => {
    if (audioServiceConnected && preloadEnabled && characters.length > 0) {
      const preloadNextCards = async () => {
        const startIndex = currentIndex + 1;
        const endIndex = Math.min(startIndex + 3, characters.length);
        const nextCards = characters.slice(startIndex, endIndex);
        
        if (nextCards.length > 0) {
          try {
            const textsToPreload = nextCards.map(char => {
              return extractChineseText(char, characterSet) || char.simplified;
            }).filter(Boolean);
            
            if (textsToPreload.length > 0) {
              preloadAudio(textsToPreload).catch(error => {
                console.error('Background preload failed:', error);
              });
            }
          } catch (error) {
            console.error('Error setting up audio preload:', error);
          }
        }
      };
      
      preloadNextCards();
    }
  }, [currentIndex, audioServiceConnected, preloadEnabled, characters, characterSet]);
  
  // Handle card grading 
  const handleCardGraded = (cardId: string, isCorrect: boolean, progress: CardProgress) => {
    const wasGradedBefore = gradedCards.has(cardId);
    const previousResult = gradedCards.get(cardId);
    
    setGradedCards(prev => new Map(prev.set(cardId, isCorrect)));
    
    if (!wasGradedBefore) {
      setSessionStats(prev => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        incorrectCount: prev.incorrectCount + (!isCorrect ? 1 : 0)
      }));
    } else if (previousResult !== isCorrect) {
      setSessionStats(prev => ({
        ...prev,
        correctCount: prev.correctCount + (isCorrect ? 1 : -1),
        incorrectCount: prev.incorrectCount + (isCorrect ? -1 : 1)
      }));
    }
    
    console.log(`Card ${cardId} graded as ${isCorrect ? 'correct' : 'incorrect'}`);
    console.log(`New streak: ${progress.streak}, Next review: ${progress.nextReviewDate}`);
  };
  
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
        totalCards={sessionStats.totalCards}
        cardsReviewed={sessionStats.cardsReviewed}
        correctCount={sessionStats.correctCount}
        incorrectCount={sessionStats.incorrectCount}
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
  const cardId = generateCardId(currentChar, characterSet);
  
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
  
  const isLastCard = currentIndex === characters.length - 1;
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
        {/* Service status indicators */}
        <div className="mb-4 space-y-2">
          {!reviewServiceConnected && (
            <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
              ⚠️ Review service unavailable. Progress tracking is limited.
            </div>
          )}
          
          {!audioServiceConnected && (
            <div className="p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded-md text-sm">
              🔊 Audio service unavailable. Pronunciation features are disabled.
            </div>
          )}
          
          {audioServiceConnected && preloadEnabled && (
            <div className="p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs">
              🎵 Audio preloading enabled for smooth playback
            </div>
          )}
        </div>
        
        {/* Study mode selector modal */}
        {showModeSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full relative z-50">
              <h3 className="text-xl font-bold mb-4">Which way would you like to study?</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
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
                  onClick={() => {
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
            />
          </div>
        )}
        
        {/* Top controls and stats */}
        <div className="mb-4 flex justify-between items-center">
          <button 
            onClick={() => setShowModeSelector(true)}
            className="text-sm text-primary hover:text-blue-700 flex items-center"
          >
            <span className="mr-1">↻</span>
            Switch to {studyMode === 'ChineseToEnglish' ? 'English → Chinese' : 'Chinese → English'} Mode
          </button>
          
          <div className="flex items-center space-x-2">
            {/* Audio preload toggle */}
            {audioServiceConnected && (
              <button
                onClick={() => setPreloadEnabled(!preloadEnabled)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  preloadEnabled 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Toggle audio preloading"
              >
                🎵 {preloadEnabled ? 'ON' : 'OFF'}
              </button>
            )}
            
            {/* Session stats */}
            {reviewServiceConnected && sessionStats.cardsReviewed > 0 && (
              <div className="text-xs text-gray-600">
                {sessionStats.cardsReviewed}/{sessionStats.totalCards} | {Math.round((sessionStats.correctCount / sessionStats.cardsReviewed) * 100)}%
              </div>
            )}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-4 flex justify-between items-center text-sm text-gray-600">
          <span>Card {currentIndex + 1} of {characters.length}</span>
          
          {isLastCard && (
            <button
              onClick={() => setShowSummary(true)}
              className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md"
            >
              Finish
            </button>
          )}
        </div>
        
        {/* Main flashcard component with audio integration */}
        <Flashcard
          cardId={cardId}
          front={cardContent.front}
          back={cardContent.back}
          onEndSession={handleEndSession}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
          onNext={!isLastCard ? handleNext : undefined}
          onCardGraded={reviewServiceConnected ? handleCardGraded : undefined}
          initialGradingState={gradedCards.get(cardId)}
          characterSet={characterSet}
          currentCharacter={currentChar}
        />
        
        {/* Complete session button for last card */}
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
};

export default FlashcardSession;