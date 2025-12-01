// IndexedDB utilities for offline caching
const DB_NAME = 'FarmBuddyDB';
const DB_VERSION = 1;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('weather')) {
          db.createObjectStore('weather', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pestChecks')) {
          db.createObjectStore('pestChecks', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('yieldPredictions')) {
          db.createObjectStore('yieldPredictions', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('failedRequests')) {
          db.createObjectStore('failedRequests', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async set<T>(store: string, key: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
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
    });
  }

  async get<T>(store: string, key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(store: string, data: T): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      const entry = {
        data,
        timestamp: Date.now(),
      };
      
      const request = objectStore.add(entry);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(store: string): Promise<Array<CacheEntry<T> & { id: number }>> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(store: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();

// Check if online
export const isOnline = () => navigator.onLine;

// Get cache age in hours
export const getCacheAge = (timestamp: number): number => {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
};
