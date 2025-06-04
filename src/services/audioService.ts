const AUDIO_SERVICE_URL = 'http://localhost:3002';

export interface AudioResponse {
  success: boolean;
  text: string;
  language: string;
  audioUrl: string;
  cached: boolean;
  responseTime: string;
}

export interface PreloadResponse {
  success: boolean;
  preloadId: string;
  status: string;
  textsCount: number;
  language: string;
  responseTime: string;
  statusUrl: string;
}

export interface PreloadStatusResponse {
  success: boolean;
  preloadId: string;
  status: 'processing' | 'completed' | 'failed';
  results: Array<{
    text: string;
    audioUrl: string;
    cached: boolean;
  }>;
  textsCount: number;
  language: string;
  processingDuration?: number;
  timestamp: string;
  responseTime: string;
}

// Get audio URL for pronunciation
export async function getAudioUrl(text: string, language = 'zh-CN'): Promise<AudioResponse> {
  try {
    console.log(`Requesting audio for text: "${text}" in language: ${language}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${AUDIO_SERVICE_URL}/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text, language }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Audio request failed with status ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Convert relative URL to absolute URL for proxy endpoint
    if (data.audioUrl && data.audioUrl.startsWith('/play/')) {
      data.audioUrl = `${AUDIO_SERVICE_URL}${data.audioUrl}`;
    }
    
    console.log('Audio response:', data);
    return data;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      console.error('Audio request timed out');
      throw new Error('Audio request timed out. Service may be slow or unavailable.');
    }
    console.error('Error getting audio URL:', error);
    throw new Error('Failed to get audio URL. Audio service may be unavailable.');
  }
}

// Preload audio for multiple texts
export async function preloadAudio(texts: string[], language = 'zh-CN'): Promise<PreloadResponse> {
  try {
    const response = await fetch(`${AUDIO_SERVICE_URL}/preload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts, language })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error preloading audio:', error);
    throw new Error('Failed to preload audio. Audio service may be unavailable.');
  }
}

// Check preload status
export async function getPreloadStatus(preloadId: string): Promise<PreloadStatusResponse> {
  try {
    const response = await fetch(`${AUDIO_SERVICE_URL}/preload/${preloadId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting preload status:', error);
    throw new Error('Failed to get preload status. Audio service may be unavailable.');
  }
}

// Check audio service health
export async function checkAudioServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${AUDIO_SERVICE_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Audio service health check:', data);
      return data.status === 'healthy';
    }
    
    console.error('Audio service health check failed with status:', response.status);
    return false;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      console.error('Audio service health check timed out');
    } else {
      console.error('Audio service health check failed:', error);
    }
    return false;
  }
}

// Audio player utility with error handling
export function playAudioUrl(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Attempting to play audio from URL:', audioUrl);
    
    const audio = new Audio();
    
    // Set up event listeners before setting src
    audio.onloadeddata = () => {
      console.log('Audio data loaded successfully');
    };
    
    audio.oncanplay = () => {
      console.log('Audio can start playing');
    };
    
    audio.onended = () => {
      console.log('Audio playback completed');
      resolve();
    };
    
    audio.onerror = (error) => {
      console.error('Audio loading/playback error:', error);
      console.error('Audio error details:', {
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src
      });
      reject(new Error('Failed to play audio - the audio source may not be accessible'));
    };
    
    // Set crossorigin to try to handle CORS
    audio.crossOrigin = 'anonymous';
    
    // Set the source
    audio.src = audioUrl;
    
    // Attempt to load and play
    audio.load();
    
    audio.play().catch(error => {
      console.error('Audio play() method failed:', error);
      reject(new Error(`Audio playback failed: ${error.message}`));
    });
  });
}

// Helper to extract Chinese text from card content
export function extractChineseText(cardContent: any, characterSet: 'simplified' | 'traditional'): string {
  if (typeof cardContent === 'string') {
    return cardContent;
  }
  
  if (cardContent && typeof cardContent === 'object') {
    // Try to get the character from different possible properties
    if (characterSet === 'simplified' && cardContent.simplified) {
      return cardContent.simplified;
    }
    if (characterSet === 'traditional' && cardContent.traditional) {
      return cardContent.traditional;
    }
    if (cardContent.character) {
      return cardContent.character;
    }
    if (cardContent.front) {
      return cardContent.front;
    }
  }
  
  return '';
}