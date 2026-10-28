/**
 * Storage service for managing generated image sessions using localStorage.
 * Includes automatic image compression to preserve browser quota and prevent QuotaExceededError.
 */

export interface ImageSession {
  id: string;
  createdAt: number;
  prompt: string;
  title: string;
  generatedImages: string[];
  originalImages: string[];
  sketchData: string | null;
  isFavorite?: boolean;
}

const STORAGE_KEY = 'el_commun_image_sessions_v1';
const MAX_SESSIONS = 30;

/**
 * Resizes and compresses a base64 image data URL so it uses minimal localStorage space
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxDimension = 720,
  quality = 0.82
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Canvas export failed, using original', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Loads all sessions from localStorage
 */
export function getStoredSessions(): ImageSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return [];
  } catch (error) {
    console.error('Failed to parse sessions from localStorage:', error);
    return [];
  }
}

/**
 * Persists session array to localStorage, handling quota limits by pruning oldest non-favorites
 */
function persistSessions(sessions: ImageSession[]): boolean {
  let list = [...sessions];

  while (list.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e: any) {
      const isQuota =
        e?.name === 'QuotaExceededError' ||
        e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e?.code === 22 ||
        e?.code === 1014;

      if (isQuota && list.length > 1) {
        // Prune the oldest non-favorite session first
        let nonFavIndex = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (!list[i].isFavorite) {
            nonFavIndex = i;
            break;
          }
        }

        if (nonFavIndex >= 0) {
          list.splice(nonFavIndex, 1);
        } else {
          // If all are favorites, remove the oldest one
          list.pop();
        }
      } else {
        console.error('Failed to persist to localStorage:', e);
        return false;
      }
    }
  }

  return false;
}

/**
 * Saves a new generation session to localStorage
 */
export async function saveGeneratedSession(input: {
  prompt: string;
  generatedImages: string[];
  originalImages?: string[];
  sketchData?: string | null;
  customTitle?: string;
}): Promise<ImageSession> {
  const currentSessions = getStoredSessions();

  // Compress generated images to keep within localStorage limits
  const compressedGenerated = await Promise.all(
    input.generatedImages.map((img) => compressImageDataUrl(img, 720, 0.82))
  );

  // Compress input images as well
  const compressedOriginals = input.originalImages
    ? await Promise.all(
        input.originalImages.map((img) => compressImageDataUrl(img, 480, 0.75))
      )
    : [];

  const compressedSketch = input.sketchData
    ? await compressImageDataUrl(input.sketchData, 480, 0.75)
    : null;

  const now = Date.now();
  const title =
    input.customTitle?.trim() ||
    (input.prompt.trim()
      ? input.prompt.trim().slice(0, 40)
      : `生成セッション ${new Date(now).toLocaleDateString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`);

  const newSession: ImageSession = {
    id: `session_${now}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    prompt: input.prompt || '',
    title,
    generatedImages: compressedGenerated,
    originalImages: compressedOriginals,
    sketchData: compressedSketch,
    isFavorite: false,
  };

  const updatedSessions = [newSession, ...currentSessions].slice(0, MAX_SESSIONS);
  persistSessions(updatedSessions);

  return newSession;
}

/**
 * Deletes a session by ID
 */
export function deleteSessionById(id: string): ImageSession[] {
  const current = getStoredSessions();
  const filtered = current.filter((s) => s.id !== id);
  persistSessions(filtered);
  return filtered;
}

/**
 * Toggles favorite flag on a session
 */
export function toggleFavoriteSession(id: string): ImageSession[] {
  const current = getStoredSessions();
  const updated = current.map((s) =>
    s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
  );
  persistSessions(updated);
  return updated;
}

/**
 * Updates a session's title
 */
export function updateSessionTitle(id: string, newTitle: string): ImageSession[] {
  const current = getStoredSessions();
  const updated = current.map((s) =>
    s.id === id ? { ...s, title: newTitle.trim() || s.title } : s
  );
  persistSessions(updated);
  return updated;
}

/**
 * Clears all sessions from localStorage
 */
export function clearAllStoredSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage sessions:', e);
  }
}
