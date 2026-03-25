import { type GitHubFileContent } from './GitHubFileContent';
import { type GitHubRepository } from './GitHubRepository';
import { type TrbManifest } from './TrbManifest';


export class GitHubClient {
    private static _instance: GitHubClient;

    public static get instance(): GitHubClient {
        if (!GitHubClient._instance) {
            GitHubClient._instance = new GitHubClient();
        }
        return GitHubClient._instance;
    }

    private _token: string = '';

    private constructor() {
        // Initialize with environment token if available.
        const environmentToken: string | undefined = import.meta.env.APP_GITHUB_TOKEN;

        if (environmentToken) {
            this._token = environmentToken;
        }
    }

    public get token(): string {
        return this._token;
    }

    public set token(newToken: string) {
        this._token = newToken;
    }

    public async getRepositories(): Promise<GitHubRepository[]> {
        if (!this._token) {
            throw new Error('GitHub token is not set.');
        }

        const response: Response = await fetch('https://api.github.com/user/repos?type=all&sort=updated&per_page=100', {
            headers: {
                'Authorization': `token ${this._token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
        }

        const repositories: GitHubRepository[] = await response.json();
        
        // Filter for repositories where the user has push permission.
        return repositories.filter((repository: GitHubRepository): boolean => !!repository.permissions?.push);
    }

    public async getFileContent(owner: string, repository: string, path: string): Promise<string | null> {
        const url: string = `https://api.github.com/repos/${owner}/${repository}/contents/${path}`;

        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json'
        };

        if (this._token) {
            headers['Authorization'] = `token ${this._token}`;
        }

        const response: Response = await fetch(url, { headers });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const data: GitHubFileContent = await response.json();
        
        if (data.encoding === 'base64' && data.content) {
            try {
                // Decode base64 content with UTF-8 support.
                return decodeURIComponent(escape(window.atob(data.content.replace(/\n/g, ''))));
            } catch {
                // Fallback to raw atob decoding.
                return window.atob(data.content.replace(/\n/g, ''));
            }
        }

        throw new Error('File content not found or encoding not supported.');
    }

    public async getSchemaVersions(): Promise<string[]> {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json'
        };

        if (this._token) {
            headers['Authorization'] = `token ${this._token}`;
        }

        const response: Response = await fetch(
            'https://api.github.com/repos/leoweyr/todo-requirement-blueprint-spec/contents/schemas?ref=master',
            { headers }
        );
        
        if (!response.ok) {
            throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
        }
        
        const data: { name: string; type: string }[] = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid API response format');
        }

        return data
            .filter((item: { name: string; type: string }): boolean => item.type === 'dir')
            .map((item: { name: string; type: string }): string => item.name)
            .sort((versionA: string, versionB: string): number => versionB.localeCompare(versionA));
    }

    public async getManifest(owner: string, repository: string): Promise<TrbManifest | null> {
        const content: string | null = await this.getFileContent(owner, repository, 'trb.manifest.json');

        if (content === null) {
            return null;
        }

        try {
            const manifest: TrbManifest = JSON.parse(content);

            if (!manifest.blueprint) {
                return null;
            }

            return manifest;
        } catch {
            return null;
        }
    }
}
