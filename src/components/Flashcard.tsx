import React, { useState } from 'react';

interface FlashcardProps {
  front: string;
  back: {
    character: string;
    pinyin: string;
    meanings: string[];
  };
  onEndSession: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const Flashcard: React.FC<FlashcardProps> = ({
  front,
  back,
  onEndSession,
  onPrevious,
  onNext,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleEndSession = () => {
    setIsConfirmingExit(true);
  };

  // Reset state when flipping to front
  const handleFlipToFront = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
  };

  // Handle navigation with automatic flip to front
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false); // Reset to front of card
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false); // Reset to front of card
    if (onNext) {
      onNext();
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
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

      {/* End session button */}
      <div className="mb-6">
        <button
          onClick={handleEndSession}
          className="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <span className="mr-1">←</span>
          <span>End Session</span>
        </button>
      </div>

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
      
      {/* Action buttons */}
      <div className="mt-6">
        {isFlipped ? (
          <div>
            {/* Flip button */}
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
                  onClick={handlePrevious}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span className="mr-1">←</span>
                  <span>Previous</span>
                </button>
              )}
              
              {onNext && (
                <button
                  onClick={handleNext}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span>Next</span>
                  <span className="ml-1">→</span>
                </button>
              )}
            </div>
          </div>
        ) : (
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
                  onClick={handlePrevious}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-200 flex items-center"
                >
                  <span className="mr-1">←</span>
                  <span>Previous</span>
                </button>
              )}
              
              {onNext && (
                <button
                  onClick={handleNext}
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