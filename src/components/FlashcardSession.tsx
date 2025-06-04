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
  gradeCard,
  getDueCards,
  type DueCard
} from '../services/reviewService';
import { 
  checkAudioServiceHealth,
  preloadAudio,
  extractChineseText 
} from '../services/audioService';
import {
  checkProgressStatsServiceHealth,
  recordSession,
  formatDeckId
} from '../services/progressStatsService';

interface SessionStats {
  totalCards: number;
  cardsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  sessionStartTime: number;
  newCardsStudied: number;
  reviewCardsStudied: number;
}

interface StudyCard {
  character: Character;
  cardId: string;
  isDue: boolean;
  dueCard?: DueCard;
  isNew: boolean;
}

const FlashcardSession: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [studyMode, setStudyMode] = useState<'ChineseToEnglish' | 'EnglishToChinese'>('ChineseToEnglish');
  const [characterSet, setCharacterSet] = useState<CharacterSet>('simplified');
  const [history, setHistory] = useState<number[]>([]);
  const [showModeSelector, setShowModeSelector] = useState<boolean>(false);
  const [preloadEnabled, setPreloadEnabled] = useState<boolean>(true);
  const [currentLevel, setCurrentLevel] = useState<string>('new-1');
  const [useSRS, setUseSRS] = useState<boolean>(true);
  
  // Service connection states
  const [reviewServiceConnected, setReviewServiceConnected] = useState<boolean>(false);
  const [audioServiceConnected, setAudioServiceConnected] = useState<boolean>(false);
  const [progressStatsServiceConnected, setProgressStatsServiceConnected] = useState<boolean>(false);
  
  // Session tracking
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalCards: 0,
    cardsReviewed: 0,
    correctCount: 0,
    incorrectCount: 0,
    sessionStartTime: Date.now(),
    newCardsStudied: 0,
    reviewCardsStudied: 0
  });
  
  const [gradedCards, setGradedCards] = useState<Map<string, boolean>>(new Map());
  const [sessionCardResults, setSessionCardResults] = useState<Array<{ cardId: string; isCorrect: boolean }>>([]);
  
  // Check all microservice connections
  useEffect(() => {
    const checkConnections = async () => {
      const [reviewHealthy, audioHealthy, progressHealthy] = await Promise.all([
        checkReviewServiceHealth(),
        checkAudioServiceHealth(), 
        checkProgressStatsServiceHealth()
      ]);
      
      setReviewServiceConnected(reviewHealthy);
      setAudioServiceConnected(audioHealthy);
      setProgressStatsServiceConnected(progressHealthy);
      
      console.log('Service connections:', {
        review: reviewHealthy,
        audio: audioHealthy,
        progress: progressHealthy
      });
    };
    
    checkConnections();
  }, []);
  
  // Load character data and create study session with SRS
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const prefs = loadPreferences();
      setStudyMode(prefs.studyMode);
      setCharacterSet(prefs.characterSet);
      setCurrentLevel(prefs.level);
      
      const allCharacters = await loadCharacterData();
      const filteredCharacters = filterByLevel(allCharacters, prefs.level);
      
      let studyCardsToCreate: StudyCard[] = [];
      
      if (reviewServiceConnected && useSRS) {
        // SRS Mode: Load due cards first, then fill with new cards
        try {
          const dueCardsResponse = await getDueCards();
          const dueCards = dueCardsResponse.dueCards || [];
          
          // Filter due cards to match current level
          const levelDueCards = dueCards.filter(dueCard => 
            dueCard.cardId.startsWith(formatDeckId(prefs.level) + '_')
          );
          
          console.log(`Found ${levelDueCards.length} due cards for ${prefs.level}`);
          
          // Add due cards to study session
          for (const dueCard of levelDueCards) {
            const cardIdParts = dueCard.cardId.split('_');
            if (cardIdParts.length > 1) {
              const characterText = cardIdParts[1];
              const character = filteredCharacters.find(char => 
                char.simplified === characterText || 
                char.forms[0]?.traditional === characterText
              );
              
              if (character) {
                studyCardsToCreate.push({
                  character,
                  cardId: dueCard.cardId,
                  isDue: true,
                  dueCard,
                  isNew: false
                });
              }
            }
          }
          
          // Fill remaining slots with new cards
          const cardCount = prefs.cardCount || 20;
          const newCardsNeeded = Math.max(0, cardCount - studyCardsToCreate.length);
          
          if (newCardsNeeded > 0) {
            // Find cards that haven't been studied yet
            const existingCardIds = new Set(studyCardsToCreate.map(sc => sc.cardId));
            const newCharacters = filteredCharacters.filter(char => {
              const cardId = generateCardId(char, prefs.characterSet);
              return !existingCardIds.has(cardId);
            });
            
            // Shuffle and take needed amount
            const shuffledNew = [...newCharacters].sort(() => 0.5 - Math.random());
            const selectedNew = shuffledNew.slice(0, newCardsNeeded);
            
            for (const character of selectedNew) {
              const cardId = generateCardId(character, prefs.characterSet);
              studyCardsToCreate.push({
                character,
                cardId,
                isDue: false,
                isNew: true
              });
            }
          }
          
        } catch (error) {
          console.error('Error loading due cards, falling back to random mode:', error);
          // Fall back to random mode if SRS fails
          const shuffled = [...filteredCharacters].sort(() => 0.5 - Math.random());
          const cardCount = prefs.cardCount || 20;
          const selectedCards = shuffled.slice(0, Math.min(cardCount, filteredCharacters.length));
          
          studyCardsToCreate = selectedCards.map(character => ({
            character,
            cardId: generateCardId(character, prefs.characterSet),
            isDue: false,
            isNew: true
          }));
        }
      } else {
        // Random Mode: Just pick random cards
        const shuffled = [...filteredCharacters].sort(() => 0.5 - Math.random());
        const cardCount = prefs.cardCount || 20;
        const selectedCards = shuffled.slice(0, Math.min(cardCount, filteredCharacters.length));
        
        studyCardsToCreate = selectedCards.map(character => ({
          character,
          cardId: generateCardId(character, prefs.characterSet),
          isDue: false,
          isNew: true
        }));
      }
      
      setStudyCards(studyCardsToCreate);
      setSessionStats(prev => ({
        ...prev,
        totalCards: studyCardsToCreate.length,
        sessionStartTime: Date.now()
      }));
      
      // Load previously graded cards from this session
      const previouslyGradedMap = new Map<string, boolean>();
      for (const studyCard of studyCardsToCreate) {
        if (reviewServiceConnected && !studyCard.isNew) {
          try {
            const progress = await getCardProgress(studyCard.cardId);
            if (progress.totalReviews > 0) {
              const isCorrect = progress.correctReviews > (progress.totalReviews / 2);
              previouslyGradedMap.set(studyCard.cardId, isCorrect);
            }
          } catch (error) {
            // Card not found, that's fine for new cards
          }
        }
      }
      
      setGradedCards(previouslyGradedMap);
      
      // Preload audio for first few cards
      if (audioServiceConnected && preloadEnabled && studyCardsToCreate.length > 1) {
        try {
          const textsToPreload = studyCardsToCreate.slice(0, 5).map(studyCard => {
            return extractChineseText(studyCard.character, prefs.characterSet) || studyCard.character.simplified;
          }).filter(Boolean);
          
          if (textsToPreload.length > 0) {
            preloadAudio(textsToPreload).catch(console.error);
          }
        } catch (error) {
          console.error('Error setting up initial preload:', error);
        }
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [reviewServiceConnected, audioServiceConnected, useSRS]);
  
  // Preload audio for upcoming cards
  useEffect(() => {
    if (audioServiceConnected && preloadEnabled && studyCards.length > 0) {
      const preloadNextCards = async () => {
        const startIndex = currentIndex + 1;
        const endIndex = Math.min(startIndex + 3, studyCards.length);
        const nextCards = studyCards.slice(startIndex, endIndex);
        
        if (nextCards.length > 0) {
          try {
            const textsToPreload = nextCards.map(studyCard => {
              return extractChineseText(studyCard.character, characterSet) || studyCard.character.simplified;
            }).filter(Boolean);
            
            if (textsToPreload.length > 0) {
              preloadAudio(textsToPreload).catch(console.error);
            }
          } catch (error) {
            console.error('Error preloading audio:', error);
          }
        }
      };
      
      preloadNextCards();
    }
  }, [currentIndex, audioServiceConnected, preloadEnabled, studyCards, characterSet]);
  
  // Track cards that have been sent to services to prevent duplicates
  const [gradedCardsInServices, setGradedCardsInServices] = useState<Set<string>>(new Set());
  
  // Handle card grading with proper microservice orchestration
  const handleCardGraded = async (cardId: string, isCorrect: boolean) => {
    console.log(`handleCardGraded called: ${cardId} = ${isCorrect}`);
    
    const wasGradedBefore = gradedCards.has(cardId);
    const previousResult = gradedCards.get(cardId);
    
    // Don't do anything if the result is the same as before
    if (wasGradedBefore && previousResult === isCorrect) {
      console.log(`Skipping duplicate grading: ${cardId} = ${isCorrect}`);
      return;
    }
    
    setGradedCards(prev => new Map(prev.set(cardId, isCorrect)));
    
    // Update session card results for progress service
    const existingResultIndex = sessionCardResults.findIndex(r => r.cardId === cardId);
    if (existingResultIndex >= 0) {
      const updatedResults = [...sessionCardResults];
      updatedResults[existingResultIndex] = { cardId, isCorrect };
      setSessionCardResults(updatedResults);
    } else {
      setSessionCardResults(prev => [...prev, { cardId, isCorrect }]);
    }
    
    // Update session stats
    if (!wasGradedBefore) {
      const currentCard = studyCards[currentIndex];
      setSessionStats(prev => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        incorrectCount: prev.incorrectCount + (!isCorrect ? 1 : 0),
        newCardsStudied: prev.newCardsStudied + (currentCard.isNew ? 1 : 0),
        reviewCardsStudied: prev.reviewCardsStudied + (!currentCard.isNew ? 1 : 0)
      }));
    } else if (previousResult !== isCorrect) {
      setSessionStats(prev => ({
        ...prev,
        correctCount: prev.correctCount + (isCorrect ? 1 : -1),
        incorrectCount: prev.incorrectCount + (isCorrect ? -1 : 1)
      }));
    }
    
    // Frontend Orchestration: Send grading to Review Service (Microservice B)
    // Use stronger deduplication to prevent double calls to services
    const serviceCallKey = `${cardId}_${isCorrect}`;
    if (reviewServiceConnected && !gradedCardsInServices.has(serviceCallKey)) {
      try {
        console.log(`Sending to Review Service: ${cardId} = ${isCorrect}`);
        setGradedCardsInServices(prev => new Set(prev.add(serviceCallKey)));
        
        const result = await gradeCard(cardId, isCorrect);
        console.log(`Card graded in Review Service: ${cardId} ${isCorrect ? 'correct' : 'incorrect'}`);
        console.log(`New streak: ${result.progress.streak}, Next review: ${result.progress.nextReviewDate}`);
        
        // Frontend Orchestration: Send grading data to Progress Service (Microservice D)
        if (progressStatsServiceConnected) {
          try {
            const deckId = formatDeckId(currentLevel);
            
            console.log(`Sending to Progress Service: ${cardId} = ${isCorrect}`);
            
            // Send individual card grading to progress service
            await fetch('http://localhost:3003/card-graded', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cardId,
                deckId,
                isCorrect,
                timestamp: new Date().toISOString(),
                reviewData: {
                  streak: result.progress.streak,
                  totalReviews: result.progress.totalReviews,
                  correctReviews: result.progress.correctReviews,
                  nextReviewDate: result.progress.nextReviewDate
                }
              })
            });
            
            console.log(`Card grading sent to Progress Service: ${cardId}`);
          } catch (error) {
            console.warn('Failed to send grading to Progress Service:', error);
            // Don't fail the grading if progress service is down
          }
        }
        
      } catch (error) {
        console.error('Failed to grade card in Review Service:', error);
        // Remove from dedupe set on error so it can be retried
        setGradedCardsInServices(prev => {
          const newSet = new Set(prev);
          newSet.delete(serviceCallKey);
          return newSet;
        });
      }
    } else {
      console.log(`Skipping service call (already sent): ${serviceCallKey}`);
    }
  };
  
  const handlePrevious = () => {
    if (history.length === 0) return;
    const prevIndex = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    setCurrentIndex(prevIndex);
  };
  
  const handleNext = () => {
    if (currentIndex >= studyCards.length - 1) {
      setShowSummary(true);
    } else {
      setHistory(prev => [...prev, currentIndex]);
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  // Handle session end with proper session recording
  const handleEndSession = async () => {
    // Frontend Orchestration: Record session to Progress Service (Microservice D)
    if (progressStatsServiceConnected && sessionCardResults.length > 0) {
      try {
        const sessionDuration = Math.floor((Date.now() - sessionStats.sessionStartTime) / 1000);
        const deckId = formatDeckId(currentLevel);
        
        await recordSession({
          deckId,
          cardsStudied: sessionStats.cardsReviewed,
          correctAnswers: sessionStats.correctCount,
          incorrectAnswers: sessionStats.incorrectCount,
          sessionDuration,
          cardResults: sessionCardResults
        });
        
        console.log('Session recorded to Progress Service successfully');
      } catch (error) {
        console.error('Failed to record session:', error);
        // Don't block navigation on failure
      }
    }
    
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
  
  if (studyCards.length === 0) {
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
  
  const currentStudyCard = studyCards[currentIndex];
  const cardContent = (() => {
    const content = getCardContent(currentStudyCard.character, characterSet);
    
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
  
  const isLastCard = currentIndex === studyCards.length - 1;
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
        
        {/* Service status indicators */}
        <div className="mb-4 space-y-2">
          {!reviewServiceConnected && (
            <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
              ⚠️ Review service unavailable. SRS features disabled.
            </div>
          )}
          
          {!audioServiceConnected && (
            <div className="p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded-md text-sm">
              🔊 Audio service unavailable. Pronunciation features disabled.
            </div>
          )}
          
          {!progressStatsServiceConnected && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              📊 Progress service unavailable. Analytics disabled.
            </div>
          )}
          
          {/* SRS Status */}
          {reviewServiceConnected && (
            <div className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs">
              🧠 SRS Mode: {currentStudyCard.isDue ? 'Review Card' : 'New Card'} 
              {currentStudyCard.dueCard && ` (${currentStudyCard.dueCard.overdueDays} days overdue)`}
            </div>
          )}
        </div>
        
        {/* Study mode selector modal */}
        {showModeSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full relative z-50">
              <h3 className="text-xl font-bold mb-4">Study Options</h3>
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
                <hr />
                <button
                  onClick={() => {
                    setUseSRS(!useSRS);
                    setShowModeSelector(false);
                    window.location.reload(); // Reload to apply SRS setting
                  }}
                  className={`w-full text-left p-3 border rounded-md hover:bg-gray-100 ${
                    useSRS ? 'bg-blue-100 border-blue-400' : 'bg-gray-100'
                  }`}
                >
                  🧠 SRS Mode: {useSRS ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <div 
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowModeSelector(false)}
            />
          </div>
        )}
        
        {/* Top controls */}
        <div className="mb-4 flex justify-between items-center">
          <button 
            onClick={() => setShowModeSelector(true)}
            className="text-sm text-primary hover:text-blue-700 flex items-center"
          >
            <span className="mr-1">⚙️</span>
            Settings
          </button>
          
          <div className="flex items-center space-x-2">
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
            
            {sessionStats.cardsReviewed > 0 && (
              <div className="text-xs text-gray-600">
                {sessionStats.cardsReviewed}/{sessionStats.totalCards} | {Math.round((sessionStats.correctCount / sessionStats.cardsReviewed) * 100)}%
              </div>
            )}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-4 flex justify-between items-center text-sm text-gray-600">
          <span>
            Card {currentIndex + 1} of {studyCards.length}
            {useSRS && ` • ${sessionStats.newCardsStudied} new, ${sessionStats.reviewCardsStudied} review`}
          </span>
          
          {isLastCard && (
            <button
              onClick={() => setShowSummary(true)}
              className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md"
            >
              Finish
            </button>
          )}
        </div>
        
        {/* Main flashcard */}
        <Flashcard
          cardId={currentStudyCard.cardId}
          front={cardContent.front}
          back={cardContent.back}
          onEndSession={handleEndSession}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
          onNext={!isLastCard ? handleNext : undefined}
          onCardGraded={reviewServiceConnected ? handleCardGraded : undefined}
          initialGradingState={gradedCards.get(currentStudyCard.cardId)}
          characterSet={characterSet}
          currentCharacter={currentStudyCard.character}
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