import { describe, expect, it } from 'vitest';

import App from '../../../src/App';


interface AppRepulsionTimerGate {
    _canStartRepulsionTimer: (
        timelineIsTransition: boolean,
        timelineRawPosition: number,
        hasEnoughNodesForRepulsion: boolean
    ) => boolean;
}


describe('App timeline repulsion timer gate integration', (): void => {
    it('starts delay counting only when slider is on a timeline tick', (): void => {
        const app: App = new App({});
        const repulsionTimerGate: AppRepulsionTimerGate = app as unknown as AppRepulsionTimerGate;

        expect(repulsionTimerGate._canStartRepulsionTimer(false, 2, true)).toBe(true);
        expect(repulsionTimerGate._canStartRepulsionTimer(false, 2.005, true)).toBe(false);
        expect(repulsionTimerGate._canStartRepulsionTimer(true, 2, true)).toBe(false);
        expect(repulsionTimerGate._canStartRepulsionTimer(false, 2, false)).toBe(false);
    });
});
