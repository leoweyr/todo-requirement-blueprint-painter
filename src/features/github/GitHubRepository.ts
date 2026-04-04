export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    permissions?: {
        admin: boolean;
        push: boolean;
        pull: boolean;
    };
}
