export const FileOpenModalView = {
    INITIAL: 'initial',
    GITHUB_AUTHENTICATION: 'github-authentication',
    REPOSITORY_SELECT: 'repository-select',
    MANIFEST_NOT_FOUND: 'manifest-not-found',
    CREATE_NEW: 'create-new'
} as const;


export type FileOpenModalView = typeof FileOpenModalView[keyof typeof FileOpenModalView];
