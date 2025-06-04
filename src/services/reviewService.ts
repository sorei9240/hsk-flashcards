const REVIEW_SERVICE_URL = 'http://localhost:3001';

export interface CardProgress {
  cardId: string;
  streak: number;
  lastReviewed: string;
  nextReviewDate: string;
  totalReviews: number;
  correctReviews: number;
}

export interface GradeResponse {
  success: boolean;
  cardId: string;
  progress: CardProgress;
  responseTime: string;
}

export interface ResetResponse {
  success: boolean;
  cardId: string;
  progress: CardProgress;
  message: string;
}

export interface DueCard extends CardProgress {
  overdueDays: number;
}

export interface DueCardsResponse {
  success: boolean;
  dueCards: DueCard[];
  count: number;
}

// Grade a flashcard (User Story 1: Grade a Flashcard)
export async function gradeCard(cardId: string, isCorrect: boolean): Promise<GradeResponse> {
  try {
    const response = await fetch(`${REVIEW_SERVICE_URL}/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        isCorrect
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error grading card:', error);
    throw new Error('Failed to grade card. Review service may be unavailable.');
  }
}

// Reset a card's progress 
export async function resetCardProgress(cardId: string): Promise<ResetResponse> {
  try {
    const response = await fetch(`${REVIEW_SERVICE_URL}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error resetting card:', error);
    throw new Error('Failed to reset card progress. Review service may be unavailable.');
  }
}

// Get card progress
export async function getCardProgress(cardId: string): Promise<CardProgress> {
  try {
    const response = await fetch(`${REVIEW_SERVICE_URL}/progress/${cardId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.progress;
  } catch (error) {
    console.error('Error getting card progress:', error);
    throw new Error('Failed to get card progress. Review service may be unavailable.');
  }
}

// Get cards due for review
export async function getDueCards(): Promise<DueCardsResponse> {
  try {
    const response = await fetch(`${REVIEW_SERVICE_URL}/due`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting due cards:', error);
    throw new Error('Failed to get due cards. Review service may be unavailable.');
  }
}

// Check if review service is healthy
export async function checkReviewServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${REVIEW_SERVICE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Review service health check failed:', error);
    return false;
  }
}

// Generate card ID from character data
export function generateCardId(character: any, characterSet: string): string {
  const charDisplay = characterSet === 'simplified' 
    ? character.simplified 
    : character.forms[0].traditional;
  
  return `${character.level[0]}_${charDisplay}`;
}