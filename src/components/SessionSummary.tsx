import React from 'react';

interface SessionSummaryProps {
  totalCards: number;
  cardsReviewed?: number;
  correctCount?: number;
  incorrectCount?: number;
  onGoHome: () => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({ 
  totalCards, 
  cardsReviewed = 0,
  correctCount = 0,
  incorrectCount = 0,
  onGoHome 
}) => {
  const accuracy = cardsReviewed > 0 ? Math.round((correctCount / cardsReviewed) * 100) : 0;
  const hasReviewData = cardsReviewed > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Great Work!</h2>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto my-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <p className="text-lg text-gray-700">
            You studied {totalCards} cards in this session.
          </p>
        </div>
        
        {/* Review statistics from Microservice B */}
        {hasReviewData && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Session Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{cardsReviewed}</div>
                <div className="text-gray-600">Cards Reviewed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
                <div className="text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{correctCount}</div>
                <div className="text-gray-600">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{incorrectCount}</div>
                <div className="text-gray-600">Incorrect</div>
              </div>
            </div>
            
            {/* Performance message */}
            <div className="mt-4 text-center text-sm">
              {accuracy >= 80 ? (
                <p className="text-green-600 font-medium">Excellent work! 🎉</p>
              ) : accuracy >= 60 ? (
                <p className="text-blue-600 font-medium">Good progress! Keep it up! 👍</p>
              ) : (
                <p className="text-orange-600 font-medium">Keep practicing - you're improving! 💪</p>
              )}
            </div>
          </div>
        )}
        
        {/* Spaced repetition info */}
        {hasReviewData && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="text-blue-800">
              <span className="font-medium">💡 Tip:</span> Your answers have been saved to optimize future review scheduling. 
              Cards you got wrong will appear sooner, while correct answers will have longer intervals.
            </p>
          </div>
        )}
        
        <div className="flex justify-center">
          <button
            onClick={onGoHome}
            className="flex items-center justify-center bg-blue-700 hover:bg-blue-500 text-white font-medium py-3 px-8 rounded-md transition-colors duration-200"
          >
            <span className="mr-2">🏠</span>
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;