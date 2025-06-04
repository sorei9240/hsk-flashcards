const PROGRESS_STATS_SERVICE_URL = 'http://localhost:3003';

export interface DeckProgress {
  cardsStudied: number;
  totalCards: number;
  completionPercentage: number;
  totalReviews: number;
  accuracy: number;
  lastStudied: string | null;
}

export interface CardAccuracy {
  cardId: string;
  accuracy: number;
  totalAttempts: number;
  correctAttempts: number;
  lastAttempt: string | null;
  recentTrend: number;
}

export interface DeckAccuracySummary {
  totalCards: number;
  averageAccuracy: number;
  weakestCards: CardAccuracy[];
  strongestCards: CardAccuracy[];
}

export interface UserStats {
  totalSessions: number;
  totalCardsStudied: number;
  overallAccuracy: number;
  totalTimeSpent: number;
  lastActivity: string | null;
}

export interface RecentActivity {
  sessionsThisWeek: number;
  cardsStudiedThisWeek: number;
  averageAccuracyThisWeek: number;
}

export interface DeckSummary {
  deckId: string;
  cardsStudied: number;
  accuracy: number;
  lastStudied: string | null;
}

export interface UserOverview {
  userStats: UserStats;
  recentActivity: RecentActivity;
  deckSummaries: DeckSummary[];
}

export interface SessionRecord {
  sessionId: string;
  deckId: string;
  timestamp: string;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  sessionDuration: number;
  accuracy: number;
}

export interface ProgressTrend {
  date: string;
  sessions: number;
  cardsStudied: number;
  correctAnswers: number;
  totalDuration: number;
  accuracy: number;
}

// Get deck progress (User Story 1)
export async function getDeckProgress(deckId: string, totalCards?: number): Promise<DeckProgress> {
  try {
    const params = new URLSearchParams();
    if (totalCards) {
      params.set('totalCards', totalCards.toString());
    }
    
    const url = `${PROGRESS_STATS_SERVICE_URL}/deck/${encodeURIComponent(deckId)}/progress${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.progress;
  } catch (error) {
    console.error('Error getting deck progress:', error);
    throw new Error('Failed to get deck progress. Progress service may be unavailable.');
  }
}

// Get deck accuracy stats (User Story 2)
export async function getDeckAccuracy(deckId: string): Promise<{ cards: CardAccuracy[]; summary: DeckAccuracySummary }> {
  try {
    const response = await fetch(`${PROGRESS_STATS_SERVICE_URL}/deck/${encodeURIComponent(deckId)}/accuracy`, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      cards: data.cards,
      summary: data.summary
    };
  } catch (error) {
    console.error('Error getting deck accuracy:', error);
    throw new Error('Failed to get deck accuracy. Progress service may be unavailable.');
  }
}

// Record a study session
export async function recordSession(sessionData: {
  deckId: string;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  sessionDuration: number;
  cardResults: Array<{ cardId: string; isCorrect: boolean }>;
}): Promise<{ sessionId: string; message: string }> {
  try {
    const response = await fetch(`${PROGRESS_STATS_SERVICE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(sessionData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      sessionId: data.sessionId,
      message: data.message
    };
  } catch (error) {
    console.error('Error recording session:', error);
    throw new Error('Failed to record session. Progress service may be unavailable.');
  }
}

// Get user overview
export async function getUserOverview(): Promise<UserOverview> {
  try {
    const response = await fetch(`${PROGRESS_STATS_SERVICE_URL}/user/overview`, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      userStats: data.userStats,
      recentActivity: data.recentActivity,
      deckSummaries: data.deckSummaries
    };
  } catch (error) {
    console.error('Error getting user overview:', error);
    throw new Error('Failed to get user overview. Progress service may be unavailable.');
  }
}

// Get session history
export async function getSessionHistory(options?: {
  limit?: number;
  offset?: number;
  deckId?: string;
}): Promise<{
  sessions: SessionRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.deckId) params.set('deckId', options.deckId);
    
    const url = `${PROGRESS_STATS_SERVICE_URL}/sessions${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      sessions: data.sessions,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Error getting session history:', error);
    throw new Error('Failed to get session history. Progress service may be unavailable.');
  }
}

// Get progress trends
export async function getProgressTrends(options?: {
  days?: number;
  deckId?: string;
}): Promise<{
  trends: ProgressTrend[];
  summary: {
    totalDays: number;
    averageDailyCards: number;
    averageDailyAccuracy: number;
  };
}> {
  try {
    const params = new URLSearchParams();
    if (options?.days) params.set('days', options.days.toString());
    if (options?.deckId) params.set('deckId', options.deckId);
    
    const url = `${PROGRESS_STATS_SERVICE_URL}/trends${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      trends: data.trends,
      summary: data.summary
    };
  } catch (error) {
    console.error('Error getting progress trends:', error);
    throw new Error('Failed to get progress trends. Progress service may be unavailable.');
  }
}

// Check if progress service is healthy
export async function checkProgressStatsServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${PROGRESS_STATS_SERVICE_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Progress/Stats service health check:', data);
      return data.status === 'healthy';
    }
    
    console.error('Progress/Stats service health check failed with status:', response.status);
    return false;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      console.error('Progress/Stats service health check timed out');
    } else {
      console.error('Progress/Stats service health check failed:', error);
    }
    return false;
  }
}

// Helper function to format HSK level for API calls
export function formatDeckId(level: string): string {
  // Convert levels like "new-1" to "new-1" for API consistency
  return level;
}

// Helper function to generate total cards count for HSK levels
export function getExpectedCardCount(level: string): number {
  const cardCounts: Record<string, number> = {
    'new-1': 300,
    'new-2': 300,
    'new-3': 300,
    'new-4': 300,
    'new-5': 300,
    'new-6': 300,
    'hsk-1': 150,
    'hsk-2': 150,
    'hsk-3': 300,
    'hsk-4': 600,
    'hsk-5': 1300,
    'hsk-6': 2500
  };
  
  return cardCounts[level] || 300; // Default fallback
}