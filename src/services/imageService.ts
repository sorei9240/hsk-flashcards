const IMAGE_PROXY_URL = 'http://localhost:3004';

export interface ImageResponse {
  success: boolean;
  imageUrl: string;
  searchTerm: string;
  cached: boolean;
  responseTime: string;
  error?: string;
}

// Simple in-memory cache for blob URLs
const imageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

// Clean cache when it gets too large
function cleanImageCache() {
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.3);
    const entries = Array.from(imageCache.entries());
    
    for (let i = 0; i < entriesToRemove; i++) {
      const [key, url] = entries[i];
      // Revoke the blob URL to free memory
      URL.revokeObjectURL(url);
      imageCache.delete(key);
    }
    
    console.log(`Cleaned ${entriesToRemove} cached images`);
  }
}

// Check if image proxy service is available
export async function checkImageServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${IMAGE_PROXY_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Image proxy service health check:', data);
      return data.status === 'healthy';
    }
    
    return false;
  } catch (error) {
    console.error('Image service health check failed:', error);
    return false;
  }
}

// Get image for flashcard
export async function getCardImage(searchTerm: string): Promise<ImageResponse> {
  const startTime = Date.now();
  
  try {
    // Clean and validate search term
    const cleanSearchTerm = searchTerm.trim().toLowerCase();
    if (!cleanSearchTerm) {
      return {
        success: false,
        imageUrl: '',
        searchTerm,
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
        error: 'Empty search term'
      };
    }
    
    // Check cache first
    const cacheKey = cleanSearchTerm;
    if (imageCache.has(cacheKey)) {
      return {
        success: true,
        imageUrl: imageCache.get(cacheKey)!,
        searchTerm,
        cached: true,
        responseTime: `${Date.now() - startTime}ms`
      };
    }
    
    console.log(`Fetching image for: "${searchTerm}"`);
    
    // Fetch from proxy service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${IMAGE_PROXY_URL}/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'image/jpeg, application/json',
      },
      body: JSON.stringify({ searchTerm: cleanSearchTerm }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        imageUrl: '',
        searchTerm,
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
        error: errorData.error || `HTTP ${response.status}`
      };
    }
    
    // Check if response is JSON (error) or image
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      return {
        success: false,
        imageUrl: '',
        searchTerm,
        cached: false,
        responseTime: `${Date.now() - startTime}ms`,
        error: errorData.error || 'Unknown error'
      };
    }
    
    // Convert image to blob URL
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    
    // Clean cache if needed
    cleanImageCache();
    
    // Cache the blob URL
    imageCache.set(cacheKey, imageUrl);
    
    const wasCached = response.headers.get('X-Cached') === 'true';
    const responseTime = Date.now() - startTime;
    
    console.log(`Image loaded for "${searchTerm}" in ${responseTime}ms (cached: ${wasCached})`);
    
    return {
      success: true,
      imageUrl,
      searchTerm,
      cached: wasCached,
      responseTime: `${responseTime}ms`
    };
    
  } catch (error) {
    console.error('Error fetching image:', error);
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        imageUrl: '',
        searchTerm,
        cached: false,
        responseTime: `${responseTime}ms`,
        error: 'Request timeout - image service may be slow'
      };
    }
    
    return {
      success: false,
      imageUrl: '',
      searchTerm,
      cached: false,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Extract search terms from English meanings for image search
export function extractImageSearchTerm(character: any, meanings: string[]): string {
  // Use the English meanings for better image search results
  if (meanings && meanings.length > 0) {
    let searchTerm = meanings[0];
    
    // Clean up common patterns in meanings
    searchTerm = searchTerm
      .replace(/\([^)]*\)/g, '') // Remove parentheses content like "(measure word)"
      .replace(/[;,].*$/, '') // Take only the first part before semicolon or comma
      .replace(/\bmeasure word\b/gi, '') // Remove "measure word"
      .replace(/\bclassifier\b/gi, '') // Remove "classifier"
      .replace(/\bparticle\b/gi, '') // Remove "particle"
      .replace(/\bprefix\b/gi, '') // Remove "prefix"
      .replace(/\bsuffix\b/gi, '') // Remove "suffix"
      .replace(/\bverb\b/gi, '') // Remove part of speech indicators
      .replace(/\bnoun\b/gi, '')
      .replace(/\badjective\b/gi, '')
      .replace(/\badverb\b/gi, '')
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .toLowerCase();
    
    // If the term is too generic, short, or common, try alternatives
    const genericTerms = ['a', 'an', 'the', 'to', 'be', 'of', 'in', 'on', 'at', 'for', 'with', 'by'];
    if (searchTerm.length < 3 || genericTerms.includes(searchTerm)) {
      // Try the second meaning if available
      if (meanings.length > 1) {
        const secondMeaning = meanings[1]
          .replace(/\([^)]*\)/g, '')
          .replace(/[;,].*$/, '')
          .replace(/\bmeasure word\b/gi, '')
          .replace(/\bclassifier\b/gi, '')
          .trim()
          .toLowerCase();
        
        if (secondMeaning.length >= 3 && !genericTerms.includes(secondMeaning)) {
          searchTerm = secondMeaning;
        }
      }
      
      // If still too generic, try combining terms
      if (searchTerm.length < 3 || genericTerms.includes(searchTerm)) {
        const validMeanings = meanings
          .slice(0, 3) // Take first 3 meanings
          .map(m => m.replace(/\([^)]*\)/g, '').replace(/[;,].*$/, '').trim())
          .filter(m => m.length >= 3 && !genericTerms.includes(m.toLowerCase()));
        
        if (validMeanings.length > 0) {
          searchTerm = validMeanings[0].toLowerCase();
        }
      }
    }
    
    // fallback - if still no good term, use a noun form or add context
    if (searchTerm.length < 3 || genericTerms.includes(searchTerm)) {
      // Add "chinese" context for very generic terms
      searchTerm = `chinese ${searchTerm}`.trim();
    }
    
    console.log(`Image search term for "${meanings[0]}": "${searchTerm}"`);
    return searchTerm;
  }
  
  // Fallback to character itself if no meanings (shouldn't happen in normal use)
  if (typeof character === 'string') {
    return `chinese character ${character}`;
  }
  
  if (character && character.simplified) {
    return `chinese character ${character.simplified}`;
  }
  
  return 'chinese character';
}

// Preload images for upcoming cards
export async function preloadCardImages(characters: any[]): Promise<void> {
  try {
    const imagesToPreload = characters.slice(0, 5); // Preload first 5 images
    
    for (const character of imagesToPreload) {
      const meanings = character.forms?.[0]?.meanings || [];
      const searchTerm = extractImageSearchTerm(character, meanings);
      
      // Only preload if not already cached
      const cacheKey = searchTerm.toLowerCase().trim();
      if (!imageCache.has(cacheKey)) {
        // Trigger image fetch (but don't wait for it)
        getCardImage(searchTerm).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error preloading images:', error);
  }
}

// Clear image cache
export function clearImageCache(): void {
  // Revoke all blob URLs to free memory
  for (const url of imageCache.values()) {
    URL.revokeObjectURL(url);
  }
  
  imageCache.clear();
  console.log('Image cache cleared');
}