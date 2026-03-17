// IndexedDB utilities for offline caching
const DB_NAME = 'FarmBuddyDB';
const DB_VERSION = 2;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init() {
    // Prevent multiple initializations
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores if they don't exist
        const stores = ['weather', 'forecast', 'gduRecords', 'pestChecks', 'yieldPredictions', 'failedRequests', 'sessions'];
        
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === 'failedRequests') {
              db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            } else {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          }
        });
      };
    });
    
    return this.initPromise;
  }

  private async ensureDb() {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize database');
  }

  async set<T>(store: string, key: string, data: T): Promise<void> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        
        const entry: CacheEntry<T> & { id: string } = {
          id: key,
          data,
          timestamp: Date.now(),
        };
        
        const request = objectStore.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error setting data in store ${store}:`, error);
        reject(error);
      }
    });
  }

  async get<T>(store: string, key: string): Promise<CacheEntry<T> | null> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(key);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error getting data from store ${store}:`, error);
        resolve(null);
      }
    });
  }

  async add<T>(store: string, data: T): Promise<number> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        
        const entry = {
          data,
          timestamp: Date.now(),
        };
        
        const request = objectStore.add(entry);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error adding data to store ${store}:`, error);
        reject(error);
      }
    });
  }

  async getAll<T>(store: string): Promise<Array<CacheEntry<T> & { id: number }>> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error getting all data from store ${store}:`, error);
        resolve([]);
      }
    });
  }

  async clear(store: string): Promise<void> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error clearing store ${store}:`, error);
        reject(error);
      }
    });
  }

  async delete(store: string, key: string): Promise<void> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Error deleting data from store ${store}:`, error);
        reject(error);
      }
    });
  }

  // Queue failed request for later sync
  async queueFailedRequest(request: {
    url: string;
    method: string;
    body?: string;
    headers?: Record<string, string>;
  }): Promise<void> {
    try {
      await this.add('failedRequests', request);
      console.log('Queued failed request for later sync');
    } catch (error) {
      console.error('Failed to queue request:', error);
    }
  }

  // Process queued requests when back online
  async processQueuedRequests(): Promise<void> {
    try {
      const queuedRequests = await this.getAll<{
        url: string;
        method: string;
        body?: string;
        headers?: Record<string, string>;
      }>('failedRequests');

      for (const entry of queuedRequests) {
        try {
          await fetch(entry.data.url, {
            method: entry.data.method,
            body: entry.data.body,
            headers: entry.data.headers,
          });
          // Remove from queue after successful sync
          await this.delete('failedRequests', String(entry.id));
          console.log('Synced queued request:', entry.data.url);
        } catch (error) {
          console.error('Failed to sync request:', error);
        }
      }
    } catch (error) {
      console.error('Error processing queued requests:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();

// Check if online
export const isOnline = () => navigator.onLine;

// Get cache age in hours
export const getCacheAge = (timestamp: number): number => {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
};

// Cache weather data with location key
export const cacheWeatherData = async (lat: number, lon: number, data: unknown) => {
  const key = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  await offlineStorage.set('weather', key, data);
};

// Get cached weather data
export const getCachedWeatherData = async (lat: number, lon: number) => {
  const key = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = await offlineStorage.get('weather', key);
  
  if (cached && getCacheAge(cached.timestamp) < 1) { // Cache valid for 1 hour
    return { data: cached.data, isCached: true, age: getCacheAge(cached.timestamp) };
  }
  
  return null;
};

// Cache forecast data
export const cacheForecastData = async (lat: number, lon: number, data: unknown) => {
  const key = `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  await offlineStorage.set('forecast', key, data);
};

// Get cached forecast data
export const getCachedForecastData = async (lat: number, lon: number) => {
  const key = `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = await offlineStorage.get('forecast', key);
  
  if (cached && getCacheAge(cached.timestamp) < 6) { // Cache valid for 6 hours
    return { data: cached.data, isCached: true, age: getCacheAge(cached.timestamp) };
  }
  
  return null;
};
