import { DomainRegistry } from '../registry/DomainRegistry';
import { BlueprintSerializer } from '../serializer/BlueprintSerializer';
import { EditorHistoryManager } from './EditorHistoryManager';


export class EditorHistoryService {
    private readonly _historyManager: EditorHistoryManager;
    private readonly _registry: DomainRegistry;

    constructor(registry: DomainRegistry) {
        this._registry = registry;
        this._historyManager = new EditorHistoryManager();
    }

    private async _restoreState(state: string): Promise<void> {
        // Cache schema and version to avoid re-fetching if possible.
        const cachedSchema: unknown = this._registry.schema;
        const cachedVersion: string = this._registry.trbVersion;

        // Clear current registry state.
        this._registry.clear();
        
        // Restore schema if available (assuming version matches or is compatible).
        // Since a snapshot from the same session is being restored, the schema is likely valid.
        // Pre-populating the registry helps BlueprintSerializer optimization.
        if (cachedSchema) {
            this._registry.schema = cachedSchema;
        }

        if (cachedVersion) {
            this._registry.trbVersion = cachedVersion;
        }

        // Deserialize the snapshot.
        // Use overwrite=true to ensure the state is set.
        // The registry is mostly cleared (except schema/version hint), so it's a fresh load.
        await BlueprintSerializer.fromYaml(state, this._registry, undefined, undefined, true);
    }

    public initialize(): void {
        const initialState = BlueprintSerializer.toYaml(this._registry);
        this._historyManager.initialize(initialState);
    }

    public pushSnapshot(): void {
        const currentState = BlueprintSerializer.toYaml(this._registry);
        this._historyManager.pushState(currentState);
    }

    public async undo(): Promise<boolean> {
        const previousState: string | null = this._historyManager.undo();

        if (previousState) {
            await this._restoreState(previousState);
            return true;
        }

        return false;
    }

    public async redo(): Promise<boolean> {
        const nextState: string | null = this._historyManager.redo();

        if (nextState) {
            await this._restoreState(nextState);
            return true;
        }

        return false;
    }

    public get canUndo(): boolean {
        return this._historyManager.canUndo;
    }

    public get canRedo(): boolean {
        return this._historyManager.canRedo;
    }
}
