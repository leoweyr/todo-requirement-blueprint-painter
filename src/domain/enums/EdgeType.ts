export const EdgeType = {
    REQUIRES: 'REQUIRES',
    OPTIMIZES: 'OPTIMIZES'
} as const;

export type EdgeType = typeof EdgeType[keyof typeof EdgeType];
