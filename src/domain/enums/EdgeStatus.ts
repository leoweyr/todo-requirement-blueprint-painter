export const EdgeStatus = {
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    CUT: 'CUT'
} as const;

export type EdgeStatus = typeof EdgeStatus[keyof typeof EdgeStatus];
