import React, { useState, useEffect } from 'react';
import { gradeCard, resetCardProgress, type CardProgress } from '../services/reviewService';
import { getAudioUrl, playAudioUrl, checkAudioServiceHealth, extractChineseText } from '../services/audioService';

interface FlashcardProps {
  cardId: string;
  front: string;
  back: {
    character: string;
    pinyin: string;
    meanings: string[];
  };
  onEndSession: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onCardGraded?: (cardId: string, isCorrect: boolean, progress: CardProgress) => void;
  initialGradingState?: boolean; // undefined = not graded, true = correct, false = incorrect
  characterSet?: 'simplified' | 'traditional'; // Add character set for audio
  currentCharacter?: any; // Add character object for audio extraction
}

const Flashcard: React.FC<FlashcardProps> = ({
  cardId,
  front,
  back,
  onEndSession,
  onPrevious,
  onNext,
  onCardGraded,
  initialGradingState,
  characterSet = 'simplified',
  currentCharacter,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [hasBeenGraded, setHasBeenGraded] = useState(initialGradingState !== undefined);
  const [lastGradingResult, setLastGradingResult] = useState<boolean | null>(initialGradingState ?? null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  
  // Audio service integration (Microservice C)
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioServiceConnected, setAudioServiceConnected] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Check audio service health on component mount
  useEffect(() => {
    const checkAudioHealth = async () => {
      const isHealthy = await checkAudioServiceHealth();
      setAudioServiceConnected(isHealthy);
      
      if (!isHealthy) {
        console.warn('Audio service is not available. Audio features will be limited.');
      }
    };
    
    checkAudioHealth();
  }, []);
  
  // Load audio when card changes (User Story 1: Pronunciation Examples)
  useEffect(() => {
    if (audioServiceConnected && front) {
      loadAudio(front);
    }
  }, [front, audioServiceConnected]);
  
  // Update state when initialGradingState changes (when navigating between cards)
  React.useEffect(() => {
    setHasBeenGraded(initialGradingState !== undefined);
    setLastGradingResult(initialGradingState ?? null);
  }, [initialGradingState]);

  // Load audio for the current card
  const loadAudio = async (text: string) => {
    if (!audioServiceConnected) return;
    
    setAudioLoading(true);
    setAudioError(null);
    
    try {
      // Extract Chinese text for audio
      const chineseText = extractChineseText(currentCharacter || { character: text }, characterSet) || text;
      
      const response = await getAudioUrl(chineseText);
      setAudioUrl(response.audioUrl);
      
      console.log(`Audio loaded for "${chineseText}" (cached: ${response.cached})`);
    } catch (error) {
      console.error('Failed to load audio:', error);
      setAudioError('Failed to load audio');
    } finally {
      setAudioLoading(false);
    }
  };

  // Play audio pronunciation 
  const handlePlayAudio = async () => {
    if (!audioUrl || isPlayingAudio) return;
    
    setIsPlayingAudio(true);
    setAudioError(null);
    
    try {
      await playAudioUrl(audioUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioError('Failed to play audio');
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleFlip = () => {
    if (!showGrading) {
      setIsFlipped(!isFlipped);
      if (!isFlipped) {
        setShowGrading(true);
      }
    }
  };

  const handleEndSession = () => {
    setIsConfirmingExit(true);
  };

  const handleFlipToFront = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setShowGrading(false);
    setGradingError(null);
  };

  const handleNavigation = (navigationFn?: () => void) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFlipped(false);
      setShowGrading(false);
      setGradingError(null);
      if (navigationFn) {
        navigationFn();
      }
    };
  };

  // Grade the card 
  const handleGrade = async (isCorrect: boolean) => {
    // Prevent grading while request is in progress
    if (isGrading) {
      return;
    }

    // Check if this is the same choice as before (no change)
    if (lastGradingResult === isCorrect) {
      return;
    }

    setIsGrading(true);
    setGradingError(null);

    try {
      const response = await gradeCard(cardId, isCorrect);
      
      if (response.success) {
        // Update local state
        setHasBeenGraded(true);
        setLastGradingResult(isCorrect);
        
        // Notify parent component about the grading
        if (onCardGraded) {
          onCardGraded(cardId, isCorrect, response.progress);
        }
        
        // Show feedback and move to next card after a delay
        setTimeout(() => {
          setShowGrading(false);
          setIsFlipped(false);
          if (onNext) {
            onNext();
          }
        }, 1000);
      }
    } catch (error) {
      setGradingError(error instanceof Error ? error.message : 'Failed to grade card');
    } finally {
      setIsGrading(false);
    }
  };

  // Reset card progress
  const handleReset = async () => {
    try {
      const response = await resetCardProgress(cardId);
      
      if (response.success) {
        setShowResetConfirm(false);
        // Reset local state to allow fresh grading
        setHasBeenGraded(false);
        setLastGradingResult(null);
        console.log('Card progress reset successfully');
      }
    } catch (error) {
      console.error('Failed to reset card:', error);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Audio service status indicator */}
      {!audioServiceConnected && (
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-xs">
          ⚠️ Audio service unavailable. Pronunciation features are disabled.
        </div>
      )}

      {/* Exit confirmation dialog */}
      {isConfirmingExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <p className="text-gray-800 mb-4 text-center">
              Are you sure you want to end the session?
              This action may result in a loss of current progress data.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsConfirmingExit(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
              >
                No
              </button>
              <button
                onClick={onEndSession}
                className="px-4 py-2 bg-red-500 text-white rounded-md"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <p className="text-gray-800 mb-4 text-center">
              Reset this card's progress? This will restart your learning streak for this card.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-orange-500 text-white rounded-md"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with end session and reset buttons */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleEndSession}
          className="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <span className="mr-1">←</span>
          <span>End Session</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-orange-600 hover:text-orange-800 flex items-center text-sm"
            title="Reset card progress"
          >
            <span className="mr-1">↻</span>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Audio error display */}
      {audioError && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {audioError}
        </div>
      )}

      {/* Card display */}
      <div 
        className="w-full bg-white rounded-xl shadow-lg p-6 cursor-pointer min-h-[264px] flex flex-col items-center justify-center overflow-hidden"
        onClick={handleFlip}
      >
        {!isFlipped ? (
          // Front
          <div className="text-center w-full">
            <p className="text-3xl font-medium text-gray-800 break-words overflow-hidden overflow-ellipsis px-2">
              {front}
            </p>
          </div>
        ) : (
          // Back
          <div className="text-center w-full overflow-auto max-h-[200px]">
            {back.character && back.character !== front && (
              <p className="text-3xl font-medium mb-2 text-gray-800 break-words px-2">
                {back.character}
              </p>
            )}
            <p className="text-lg text-gray-800 mb-4 break-words px-2">
              {back.pinyin}
            </p>
            
            {/* Audio button under pinyin */}
            {audioServiceConnected && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAudio();
                  }}
                  disabled={audioLoading || isPlayingAudio || !audioUrl}
                  className="w-10 h-10 bg-blue-200 hover:bg-blue-300 text-white rounded-lg disabled:bg-gray-300 transition-colors duration-200 flex items-center justify-center"
                  title="Play pronunciation"
                >
                  {audioLoading ? '⏳' : isPlayingAudio ? '🔊' : '🔊'}
                </button>
              </div>
            )}
            
            <div className="px-2">
              {back.meanings.map((meaning, index) => (
                <p key={index} className="text-md mb-1 text-gray-800 break-words">
                  {meaning}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Grading error */}
      {gradingError && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {gradingError}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="mt-6">
        {isFlipped && showGrading ? (
          hasBeenGraded ? (
            // Card has been graded - show current choice and allow correction
            <div>
              <div className="mb-4 text-center">
                <div className={`p-3 border rounded-md mb-3 ${
                  lastGradingResult 
                    ? 'bg-green-100 border-green-400 text-green-700' 
                    : 'bg-red-100 border-red-400 text-red-700'
                }`}>
                  {lastGradingResult ? '✓ Marked as Correct' : '✗ Marked as Incorrect'}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  Made a mistake? You can change your answer:
                </p>
                
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => handleGrade(false)}
                    disabled={isGrading || lastGradingResult === false}
                    className={`py-2 px-4 font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center ${
                      lastGradingResult === false 
                        ? 'bg-red-600 text-white cursor-not-allowed' 
                        : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white'
                    }`}
                  >
                    {isGrading && lastGradingResult !== false ? (
                      <span className="animate-spin mr-1">⏳</span>
                    ) : (
                      <span className="mr-1">✗</span>
                    )}
                    <span>Incorrect</span>
                  </button>
                  
                  <button
                    onClick={() => handleGrade(true)}
                    disabled={isGrading || lastGradingResult === true}
                    className={`py-2 px-4 font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center ${
                      lastGradingResult === true 
                        ? 'bg-green-600 text-white cursor-not-allowed' 
                        : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white'
                    }`}
                  >
                    {isGrading && lastGradingResult !== true ? (
                      <span className="animate-spin mr-1">⏳</span>
                    ) : (
                      <span className="mr-1">✓</span>
                    )}
                    <span>Correct</span>
                  </button>
                </div>
              </div>
              
              {/* Flip back button */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleFlipToFront}
                  className="py-2 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
                >
                  <span className="mr-1">↻</span>
                  <span>Flip Back</span>
                </button>
              </div>
            </div>
          ) : (
            // Initial grading buttons
            <div>
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-600 mb-3">How well did you know this card?</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => handleGrade(false)}
                    disabled={isGrading}
                    className="py-2 px-4 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
                  >
                    {isGrading ? (
                      <span className="animate-spin mr-1">⏳</span>
                    ) : (
                      <span className="mr-1">✗</span>
                    )}
                    <span>Incorrect</span>
                  </button>
                  
                  <button
                    onClick={() => handleGrade(true)}
                    disabled={isGrading}
                    className="py-2 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
                  >
                    {isGrading ? (
                      <span className="animate-spin mr-1">⏳</span>
                    ) : (
                      <span className="mr-1">✓</span>
                    )}
                    <span>Correct</span>
                  </button>
                </div>
              </div>
              
              {/* Flip back button */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleFlipToFront}
                  className="py-2 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
                >
                  <span className="mr-1">↻</span>
                  <span>Flip Back</span>
                </button>
              </div>
            </div>
          )
        ) : isFlipped ? (
          // Back of card without grading 
          <div>
            <div className="flex justify-center mb-4">
              <button
                onClick={handleFlipToFront}
                className="py-2 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
              >
                <span className="mr-1">↻</span>
                <span>Flip</span>
              </button>
            </div>
            
            {/* Navigation buttons on back */}
            <div className="mt-4 flex justify-center space-x-4">
              {onPrevious && (
                <button
                  onClick={handleNavigation(onPrevious)}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span className="mr-1">←</span>
                  <span>Previous</span>
                </button>
              )}
              
              {onNext && (
                <button
                  onClick={handleNavigation(onNext)}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span>Next</span>
                  <span className="ml-1">→</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          // Front of card
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFlip();
              }}
              className="py-2 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
            >
              <span className="mr-1">↻</span>
              <span>Flip</span>
            </button>
            
            {/* Navigation buttons on front*/}
            <div className="flex space-x-4">
              {onPrevious && (
                <button
                  onClick={handleNavigation(onPrevious)}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span className="mr-1">←</span>
                  <span>Previous</span>
                </button>
              )}
              
              {onNext && (
                <button
                  onClick={handleNavigation(onNext)}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span>Next</span>
                  <span className="ml-1">→</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Flashcard;