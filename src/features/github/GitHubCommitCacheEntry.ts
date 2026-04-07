export interface GitHubCommitCacheEntry {
    owner: string;
    repository: string;
    path: string;
    sha: string;
    content: string | null;
    cachedAt: number;
}
