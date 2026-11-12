// Utility for fetching travel & landmark photos, destination covers and Google Maps navigation links

import { detectTripDestination, getKnownDestinationKey } from './geoUtils';
import type { Activity } from '../types';

// Curated high-resolution cover photos for destinations (Unsplash optimized)
export const DESTINATION_COVERS: Record<string, string> = {
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80', // Bangkok Wat Arun & Chao Phraya
  chiangmai: 'https://images.unsplash.com/photo-1513415564515-763d91423bdd?auto=format&fit=crop&w=1600&q=80', // Chiang Mai Wat Phra That Doi Suthep
  phuket: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1600&q=80', // Phuket Promthep cape & emerald ocean
  pattaya: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1600&q=80', // Pattaya / Koh Larn beach
  huahin: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80', // Hua Hin sea & sand
  khaoyai: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80', // Khao Yai lush mist & mountain
  krabi: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1600&q=80', // Krabi Railay beach & cliffs
  nan: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80', // Nan Sapan green fields
  samui: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?auto=format&fit=crop&w=1600&q=80', // Koh Samui palms
  kanchanaburi: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=1600&q=80', // Kanchanaburi River Kwai & waterfalls
  ayutthaya: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1600&q=80', // Ayutthaya ancient stupas
  chiangrai: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1600&q=80', // Chiang Rai mountain & temples
  maehongson: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80', // Pai / Mae Hong Son mist
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80', // Tokyo tower
  osaka: 'https://images.unsplash.com/photo-1590559899731-a372a1464e29?auto=format&fit=crop&w=1600&q=80', // Osaka castle
  seoul: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1600&q=80', // Seoul skyline
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=80', // Marina Bay Sands
};

// High quality fallback images based on activity categories
export const CATEGORY_FALLBACKS: Record<string, string> = {
  Cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80',
  Food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
  Culture: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1000&q=80',
  Nature: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
  Shopping: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1000&q=80',
  Hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
  Transport: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80',
  Activity: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80',
};

// Default fallback photo
export const DEFAULT_TRIP_COVER =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80';

// In-memory cache for fetched landmark images to prevent duplicate network calls
const imageCache: Map<string, string> = new Map();

/**
 * Returns a high-res cover photo for a trip based on its name and description
 */
export const getDestinationCover = (tripName: string = '', tripDescription: string = ''): string => {
  const destKey = getKnownDestinationKey(`${tripName} ${tripDescription}`);
  if (destKey && DESTINATION_COVERS[destKey]) {
    return DESTINATION_COVERS[destKey];
  }

  const dest = detectTripDestination(tripName, tripDescription);
  const matchedKey = getKnownDestinationKey(dest.name);
  if (matchedKey && DESTINATION_COVERS[matchedKey]) {
    return DESTINATION_COVERS[matchedKey];
  }

  return DESTINATION_COVERS.bangkok || DEFAULT_TRIP_COVER;
};

/**
 * Cleans user titles from emojis, day indicators and numbering for Wikipedia searching
 * e.g., "☕ Graph Cafe" -> "Graph Cafe", "1. วัดพระแก้ว" -> "วัดพระแก้ว"
 */
export const cleanSearchTitle = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/^[\d\.\-\s]+/, '') // Remove leading numbers "1. ", "01 - "
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Automatically fetch real photo for a landmark from Wikipedia / Wikimedia Commons
 */
export const fetchPlacePhoto = async (placeTitle: string): Promise<string | null> => {
  const cleanTitle = cleanSearchTitle(placeTitle);
  if (!cleanTitle || cleanTitle.length < 2) return null;

  if (imageCache.has(cleanTitle)) {
    return imageCache.get(cleanTitle) || null;
  }

  try {
    // 1. Try Thai Wikipedia pageimages search (finds disambiguated and canonical articles)
    const thRes = await fetch(
      `https://th.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanTitle
      )}&gsrlimit=3&prop=pageimages&pithumbsize=960&format=json&origin=*`
    );
    const thData = await thRes.json();

    if (thData?.query?.pages) {
      const pages = Object.values(thData.query.pages) as any[];
      // Find the first page with a thumbnail
      for (const page of pages) {
        if (page?.thumbnail?.source) {
          const imgUrl = page.thumbnail.source;
          imageCache.set(cleanTitle, imgUrl);
          return imgUrl;
        }
      }
    }

    // 2. Try English Wikipedia pageimages search
    const enRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanTitle
      )}&gsrlimit=3&prop=pageimages&pithumbsize=960&format=json&origin=*`
    );
    const enData = await enRes.json();

    if (enData?.query?.pages) {
      const pages = Object.values(enData.query.pages) as any[];
      for (const page of pages) {
        if (page?.thumbnail?.source) {
          const imgUrl = page.thumbnail.source;
          imageCache.set(cleanTitle, imgUrl);
          return imgUrl;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch photo from Wikipedia for:', cleanTitle, err);
  }

  return null;
};

/**
 * Get display image for an activity (custom image -> cached -> category fallback)
 */
export const getActivityDisplayImage = (act: Activity): string => {
  if (act.imageUrl && act.imageUrl.trim().length > 0) {
    return act.imageUrl;
  }

  const clean = cleanSearchTitle(act.title || act.location || '');
  if (clean && imageCache.has(clean)) {
    return imageCache.get(clean)!;
  }

  return CATEGORY_FALLBACKS[act.category] || CATEGORY_FALLBACKS.Activity;
};

/**
 * Generate Google Maps turn-by-turn navigation URL
 */
export const getGoogleMapsUrl = (locationOrTitle: string, lat?: number, lng?: number): string => {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationOrTitle)}`;
};

