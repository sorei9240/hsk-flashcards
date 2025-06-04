import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDeckProgress,
  getDeckAccuracy,
  getUserOverview,
  getProgressTrends,
  checkProgressStatsServiceHealth,
  formatDeckId,
  getExpectedCardCount,
  type DeckProgress,
  type CardAccuracy,
  type UserOverview,
  type ProgressTrend,
  type DeckAccuracySummary
} from '../services/progressStatsService';

const ProgressDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [serviceConnected, setServiceConnected] = useState<boolean>(false);
  const [userOverview, setUserOverview] = useState<UserOverview | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<string>('new-1');
  const [deckProgress, setDeckProgress] = useState<DeckProgress | null>(null);
  const [deckAccuracy, setDeckAccuracy] = useState<{ cards: CardAccuracy[]; summary: DeckAccuracySummary } | null>(null);
  const [progressTrends, setProgressTrends] = useState<{ trends: ProgressTrend[]; summary: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deck' | 'accuracy' | 'trends'>('overview');
  const [error, setError] = useState<string | null>(null);

  const deckOptions = [
    { value: 'new-1', label: 'HSK 1' },
    { value: 'new-2', label: 'HSK 2' },
    { value: 'new-3', label: 'HSK 3' },
    { value: 'new-4', label: 'HSK 4' },
    { value: 'new-5', label: 'HSK 5' },
    { value: 'new-6', label: 'HSK 6' }
  ];

  // Check service connection and load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      const isHealthy = await checkProgressStatsServiceHealth();
      setServiceConnected(isHealthy);
      
      if (!isHealthy) {
        setError('Progress/Stats service is not available. Please ensure the service is running on port 3003.');
        setLoading(false);
        return;
      }

      try {
        // Load user overview
        const overview = await getUserOverview();
        setUserOverview(overview);
        
        // Load deck-specific data for selected deck
        await loadDeckData(selectedDeck);
        
      } catch (error) {
        console.error('Error loading progress data:', error);
        setError('Failed to load progress data. Please try again.');
      }
      
      setLoading(false);
    };
    
    loadData();
  }, []);

  // Load deck-specific data when deck selection changes
  useEffect(() => {
    if (serviceConnected) {
      loadDeckData(selectedDeck);
    }
  }, [selectedDeck, serviceConnected]);

  const loadDeckData = async (deckId: string) => {
    try {
      const formattedDeckId = formatDeckId(deckId);
      const expectedCards = getExpectedCardCount(deckId);
      
      // Load deck progress, accuracy, and trends in parallel
      const [progress, accuracy, trends] = await Promise.all([
        getDeckProgress(formattedDeckId, expectedCards),
        getDeckAccuracy(formattedDeckId),
        getProgressTrends({ days: 30, deckId: formattedDeckId })
      ]);
      
      setDeckProgress(progress);
      setDeckAccuracy(accuracy);
      setProgressTrends(trends);
      
    } catch (error) {
      console.error('Error loading deck data:', error);
      // Don't set error here as this might be expected for new decks
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading progress data...</p>
        </div>
      </div>
    );
  }

  if (!serviceConnected || error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl">←</span>
            </button>
            <h2 className="text-2xl font-bold">Progress Dashboard</h2>
          </div>
          
          <div className="text-center p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">Service Unavailable</h3>
            <p className="text-gray-600 mb-4">
              {error || 'The Progress/Stats service is not available.'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Make sure Microservice D is running on port 3003.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
        
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl">←</span>
          </button>
          <h2 className="text-2xl font-bold">Progress Dashboard</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'deck', label: 'Deck Progress' },
            { key: 'accuracy', label: 'Accuracy Stats' },
            { key: 'trends', label: 'Trends' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && userOverview && (
          <div className="space-y-6">
            {/* User Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{userOverview.userStats.totalSessions}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{userOverview.userStats.totalCardsStudied}</div>
                <div className="text-sm text-gray-600">Cards Studied</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{userOverview.userStats.overallAccuracy}%</div>
                <div className="text-sm text-gray-600">Overall Accuracy</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{Math.round(userOverview.userStats.totalTimeSpent / 60)}</div>
                <div className="text-sm text-gray-600">Minutes Studied</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">This Week</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xl font-bold">{userOverview.recentActivity.sessionsThisWeek}</div>
                  <div className="text-sm text-gray-600">Sessions</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{userOverview.recentActivity.cardsStudiedThisWeek}</div>
                  <div className="text-sm text-gray-600">Cards</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{userOverview.recentActivity.averageAccuracyThisWeek}%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
              </div>
            </div>

            {/* Deck Summaries */}
            {userOverview.deckSummaries.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Deck Progress</h3>
                <div className="space-y-3">
                  {userOverview.deckSummaries.map((deck) => (
                    <div key={deck.deckId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">HSK {deck.deckId.replace('new-', '')}</div>
                        <div className="text-sm text-gray-600">{deck.cardsStudied} cards studied</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{deck.accuracy}%</div>
                        <div className="text-xs text-gray-500">accuracy</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deck Progress Tab */}
        {activeTab === 'deck' && (
          <div className="space-y-6">
            {/* Deck Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Deck</label>
              <select
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
              >
                {deckOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deck Progress Display */}
            {deckProgress ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">
                    HSK {selectedDeck.replace('new-', '')} Progress
                  </h3>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Completion</span>
                      <span>{deckProgress.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${deckProgress.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{deckProgress.cardsStudied}</div>
                      <div className="text-sm text-gray-600">Cards Studied</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{deckProgress.totalReviews}</div>
                      <div className="text-sm text-gray-600">Total Reviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{deckProgress.accuracy}%</div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{deckProgress.totalCards}</div>
                      <div className="text-sm text-gray-600">Total Cards</div>
                    </div>
                  </div>

                  {deckProgress.lastStudied && (
                    <div className="mt-4 text-sm text-gray-600">
                      Last studied: {new Date(deckProgress.lastStudied).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                No progress data available for this deck yet. Start studying to see your progress!
              </div>
            )}
          </div>
        )}

        {/* Accuracy Tab */}
        {activeTab === 'accuracy' && (
          <div className="space-y-6">
            {/* Deck Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Deck</label>
              <select
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 py-2 px-3 border"
              >
                {deckOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {deckAccuracy && deckAccuracy.cards.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{deckAccuracy.summary.totalCards}</div>
                    <div className="text-sm text-gray-600">Cards Tracked</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{deckAccuracy.summary.averageAccuracy}%</div>
                    <div className="text-sm text-gray-600">Average Accuracy</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{deckAccuracy.summary.weakestCards.length}</div>
                    <div className="text-sm text-gray-600">Cards Need Work</div>
                  </div>
                </div>

                {/* Weakest Cards */}
                {deckAccuracy.summary.weakestCards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Cards Needing Practice</h3>
                    <div className="space-y-2">
                      {deckAccuracy.summary.weakestCards.slice(0, 5).map((card) => (
                        <div key={card.cardId} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                          <div>
                            <div className="font-medium">{card.cardId.split('_')[1] || card.cardId}</div>
                            <div className="text-sm text-gray-600">{card.totalAttempts} attempts</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">{card.accuracy}%</div>
                            <div className="text-xs text-gray-500">accuracy</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strongest Cards */}
                {deckAccuracy.summary.strongestCards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Well-Known Cards</h3>
                    <div className="space-y-2">
                      {deckAccuracy.summary.strongestCards.slice(0, 5).map((card) => (
                        <div key={card.cardId} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                          <div>
                            <div className="font-medium">{card.cardId.split('_')[1] || card.cardId}</div>
                            <div className="text-sm text-gray-600">{card.totalAttempts} attempts</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{card.accuracy}%</div>
                            <div className="text-xs text-gray-500">accuracy</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                No accuracy data available for this deck yet. Start studying to see detailed card performance!
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {progressTrends && progressTrends.trends.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{progressTrends.summary.totalDays}</div>
                    <div className="text-sm text-gray-600">Active Days</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{progressTrends.summary.averageDailyCards}</div>
                    <div className="text-sm text-gray-600">Avg Cards/Day</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{progressTrends.summary.averageDailyAccuracy}%</div>
                    <div className="text-sm text-gray-600">Avg Accuracy</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recent Activity (Last 30 Days)</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {progressTrends.trends.slice(-10).reverse().map((trend) => (
                      <div key={trend.date} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{new Date(trend.date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-600">{trend.sessions} sessions</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{trend.cardsStudied} cards</div>
                          <div className="text-sm text-gray-600">{trend.accuracy}% accuracy</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                No trend data available yet. Study for a few days to see your progress trends!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboard;