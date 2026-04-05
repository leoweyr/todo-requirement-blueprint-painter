export const RollDirection = {
    UP: 'up',
    DOWN: 'down',
    NONE: 'none'
} as const;


export type RollDirection = typeof RollDirection[keyof typeof RollDirection];
