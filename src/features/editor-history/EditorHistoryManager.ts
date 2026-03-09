export class EditorHistoryManager {
    private static readonly MAX_HISTORY_SIZE: number = 50;

    private _undoStack: string[] = [];
    private _redoStack: string[] = [];
    private _currentState: string | null = null;

    public initialize(initialState: string): void {
        this._undoStack = [];
        this._redoStack = [];
        this._currentState = initialState;
    }

    public pushState(newState: string): void {
        if (this._currentState === newState) {
            return;
        }

        if (this._currentState !== null) {
            this._undoStack.push(this._currentState);
            
            // Enforce size limit.
            if (this._undoStack.length > EditorHistoryManager.MAX_HISTORY_SIZE) {
                this._undoStack.shift();  // Remove oldest.
            }
        }

        this._currentState = newState;
        this._redoStack = [];  // Clear redo stack on new branch of history.
    }

    public undo(): string | null {

        if (this._undoStack.length === 0 || this._currentState === null) {
            return null;
        }

        // 1. Move current state to redo stack.
        this._redoStack.push(this._currentState);

        // 2. Pop previous state from undo stack.
        const previousState: string = this._undoStack.pop() as string;
        
        // 3. Set as current.
        this._currentState = previousState;

        return previousState;
    }

    public redo(): string | null {
        if (this._redoStack.length === 0 || this._currentState === null) {
            return null;
        }

        // 1. Move current state to undo stack.
        this._undoStack.push(this._currentState);

        // 2. Pop next state from redo stack.
        const nextState: string = this._redoStack.pop() as string;
        
        // 3. Set as current.
        this._currentState = nextState;

        return nextState;
    }

    public clear(): void {
        this._undoStack = [];
        this._redoStack = [];
        this._currentState = null;
    }

    public get canUndo(): boolean {
        return this._undoStack.length > 0;
    }

    public get canRedo(): boolean {
        return this._redoStack.length > 0;
    }
}
