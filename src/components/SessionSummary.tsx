import React from 'react';

interface SessionSummaryProps {
  totalCards: number;
  onGoHome: () => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({ 
  totalCards, 
  onGoHome 
}) => {
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