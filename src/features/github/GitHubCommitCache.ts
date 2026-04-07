import { type GitHubCommitCacheEntry } from './GitHubCommitCacheEntry';


export class GitHubCommitCache {
    private static _instance: GitHubCommitCache;

    public static get instance(): GitHubCommitCache {
        if (!GitHubCommitCache._instance) {
            GitHubCommitCache._instance = new GitHubCommitCache();
        }

        return GitHubCommitCache._instance;
    }

    private readonly _DATABASE_NAME: string = 'github-commit-cache';
    private readonly _DATABASE_VERSION: number = 1;
    private readonly _STORE_NAME: string = 'file-contents';

    private _database: IDBDatabase | null = null;
    private _databasePromise: Promise<IDBDatabase> | null = null;

    private constructor() {}

    private _buildCacheKey(owner: string, repository: string, path: string, sha: string): string {
        return `${owner}/${repository}/${path}@${sha}`;
    }

    private async _openDatabase(): Promise<IDBDatabase> {
        if (this._database) {
            return this._database;
        }

        if (this._databasePromise) {
            return this._databasePromise;
        }

        this._databasePromise = new Promise<IDBDatabase>((
            resolve: (database: IDBDatabase) => void,
            reject: (error: Error) => void
        ): void => {
            const request: IDBOpenDBRequest = indexedDB.open(this._DATABASE_NAME, this._DATABASE_VERSION);

            request.onerror = (): void => {
                reject(new Error('Failed to open IndexedDB for GitHub commit cache.'));
            };

            request.onsuccess = (): void => {
                this._database = request.result;
                resolve(request.result);
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
                const database: IDBDatabase = (event.target as IDBOpenDBRequest).result;

                if (!database.objectStoreNames.contains(this._STORE_NAME)) {
                    const store: IDBObjectStore = database.createObjectStore(this._STORE_NAME, { keyPath: 'cacheKey' });

                    store.createIndex('sha', 'sha', { unique: false });
                    store.createIndex('cachedAt', 'cachedAt', { unique: false });
                }
            };
        });

        return this._databasePromise;
    }

    public async get(owner: string, repository: string, path: string, sha: string): Promise<string | null | undefined> {
        try {
            const database: IDBDatabase = await this._openDatabase();
            const cacheKey: string = this._buildCacheKey(owner, repository, path, sha);

            return new Promise<string | null | undefined>((
                resolve: (content: string | null | undefined) => void
            ): void => {
                const transaction: IDBTransaction = database.transaction(this._STORE_NAME, 'readonly');
                const store: IDBObjectStore = transaction.objectStore(this._STORE_NAME);
                const request: IDBRequest<GitHubCommitCacheEntry & { cacheKey: string } | undefined> = store.get(cacheKey);

                request.onerror = (): void => {
                    // Return undefined on error to indicate cache miss.
                    resolve(undefined);
                };

                request.onsuccess = (): void => {
                    const entry: (GitHubCommitCacheEntry & { cacheKey: string }) | undefined = request.result;

                    if (entry === undefined) {
                        // Cache miss.
                        resolve(undefined);
                        return;
                    }

                    // Git commit content is immutable, so cached entry is always valid.
                    resolve(entry.content);
                };
            });
        } catch {
            // Return undefined on any error to indicate cache miss.
            return undefined;
        }
    }

    public async set(owner: string, repository: string, path: string, sha: string, content: string | null): Promise<void> {
        try {
            const database: IDBDatabase = await this._openDatabase();
            const cacheKey: string = this._buildCacheKey(owner, repository, path, sha);

            const entry: GitHubCommitCacheEntry & { cacheKey: string } = {
                cacheKey,
                owner,
                repository,
                path,
                sha,
                content,
                cachedAt: Date.now()
            };

            return new Promise<void>((
                resolve: () => void,
                reject: (error: Error) => void
            ): void => {
                const transaction: IDBTransaction = database.transaction(this._STORE_NAME, 'readwrite');
                const store: IDBObjectStore = transaction.objectStore(this._STORE_NAME);
                const request: IDBRequest = store.put(entry);

                request.onerror = (): void => {
                    reject(new Error('Failed to store entry in IndexedDB cache.'));
                };

                request.onsuccess = (): void => {
                    resolve();
                };
            });
        } catch {
            // Silently fail on cache write errors.
        }
    }

    public async clear(): Promise<void> {
        try {
            const database: IDBDatabase = await this._openDatabase();

            return new Promise<void>((
                resolve: () => void,
                reject: (error: Error) => void
            ): void => {
                const transaction: IDBTransaction = database.transaction(this._STORE_NAME, 'readwrite');
                const store: IDBObjectStore = transaction.objectStore(this._STORE_NAME);
                const request: IDBRequest = store.clear();

                request.onerror = (): void => {
                    reject(new Error('Failed to clear IndexedDB cache.'));
                };

                request.onsuccess = (): void => {
                    resolve();
                };
            });
        } catch {
            // Silently fail on cache clear errors.
        }
    }

    public async getCacheStats(): Promise<{ entryCount: number; oldestEntryTime: number | null }> {
        try {
            const database: IDBDatabase = await this._openDatabase();

            return new Promise<{ entryCount: number; oldestEntryTime: number | null }>((
                resolve: (stats: { entryCount: number; oldestEntryTime: number | null }) => void
            ): void => {
                const transaction: IDBTransaction = database.transaction(this._STORE_NAME, 'readonly');
                const store: IDBObjectStore = transaction.objectStore(this._STORE_NAME);
                const countRequest: IDBRequest<number> = store.count();
                let entryCount: number = 0;
                let oldestEntryTime: number | null = null;

                countRequest.onsuccess = (): void => {
                    entryCount = countRequest.result;
                };

                const index: IDBIndex = store.index('cachedAt');
                const cursorRequest: IDBRequest<IDBCursorWithValue | null> = index.openCursor();

                cursorRequest.onsuccess = (): void => {
                    const cursor: IDBCursorWithValue | null = cursorRequest.result;

                    if (cursor) {
                        const entry: GitHubCommitCacheEntry = cursor.value as GitHubCommitCacheEntry;

                        oldestEntryTime = entry.cachedAt;
                    }
                };

                transaction.oncomplete = (): void => {
                    resolve({ entryCount, oldestEntryTime });
                };

                transaction.onerror = (): void => {
                    resolve({ entryCount: 0, oldestEntryTime: null });
                };
            });
        } catch {
            return { entryCount: 0, oldestEntryTime: null };
        }
    }
}
