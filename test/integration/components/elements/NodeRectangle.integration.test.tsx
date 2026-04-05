import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Node, NodeStatus } from '@todo-requirement-blueprint/domain';

import NodeRectangle from '../../../../src/components/elements/NodeRectangle';
import { ReadOnlyView } from '../../../../src/features/readonly/ReadOnlyView';


describe('NodeRectangle integration', (): void => {
    const nodeId: string = 'c6c37f43-2cbc-4fa3-a8af-c8509cef4fb6';
    const tooltipText: string = '1.0.5 (2026/2/28)';
    let readOnlyModeSpy: MockInstance;

    beforeEach((): void => {
        readOnlyModeSpy = vi.spyOn(ReadOnlyView.instance, 'isReadOnly');
    });

    afterEach((): void => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('shows and hides version tooltip on hover in edit mode', async (): Promise<void> => {
        const user = userEvent.setup();
        readOnlyModeSpy.mockReturnValue(false);

        render(<NodeRectangle node={createTooltipTestNode()} x={120} y={120} />);

        const nodeElement: HTMLElement = screen.getByTestId(`node-rectangle-${nodeId}`);

        expect(screen.queryByText(tooltipText)).not.toBeInTheDocument();

        await user.hover(nodeElement);

        expect(screen.getByText(tooltipText)).toBeInTheDocument();

        await user.unhover(nodeElement);

        expect(screen.queryByText(tooltipText)).not.toBeInTheDocument();
    });

    it('shows and hides version tooltip on hover in read-only mode', async (): Promise<void> => {
        const user = userEvent.setup();
        readOnlyModeSpy.mockReturnValue(true);

        render(<NodeRectangle node={createTooltipTestNode()} x={120} y={120} />);

        const nodeElement: HTMLElement = screen.getByTestId(`node-rectangle-${nodeId}`);

        expect(screen.queryByText(tooltipText)).not.toBeInTheDocument();

        await user.hover(nodeElement);

        expect(screen.getByText(tooltipText)).toBeInTheDocument();

        await user.unhover(nodeElement);

        expect(screen.queryByText(tooltipText)).not.toBeInTheDocument();
    });
});


function createTooltipTestNode(): Node {
    const nodeStatus: NodeStatus = new NodeStatus('L1_MVP', 'MVP', {
        backgroundColor: '#06b6d4',
        borderColor: '#036d7f'
    });

    return new Node(
        'c6c37f43-2cbc-4fa3-a8af-c8509cef4fb6',
        'TODO Requirement Blueprint Spec',
        '1.0.5',
        '2026-02-28T10:48:39.000Z',
        nodeStatus,
        { url: 'https://example.com' }
    );
}
