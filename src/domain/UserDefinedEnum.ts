import { ValidationError } from './exceptions/ValidationError';


export class UserDefinedEnum {
    private _name: string;
    private _description: string;
    private _metadata?: Record<string, unknown>;
    private _anchorName?: string;

    constructor(name: string, description: string, metadata?: Record<string, unknown>, anchorName?: string) {
        this.validateName(name);

        this._name = name;
        this._description = description;
        this._metadata = metadata;
        this._anchorName = anchorName;
    }

    public get name(): string {
        return this._name;
    }

    public get description(): string {
        return this._description;
    }

    public get metadata(): Record<string, unknown> | undefined {
        return this._metadata;
    }

    public get anchorName(): string | undefined {
        return this._anchorName;
    }

    public set anchorName(value: string | undefined) {
        this._anchorName = value;
    }

    public update(name: string, description: string, metadata?: Record<string, unknown>): void {
        this.validateName(name);

        this._name = name;
        this._description = description;
        this._metadata = metadata;
    }

    public toObject(): { name: string; description: string; metadata?: Record<string, unknown> } {
        const result: { name: string; description: string; metadata?: Record<string, unknown> } = {
            name: this._name,
            description: this._description
        };

        if (this._metadata && Object.keys(this._metadata).length > 0) {
            result.metadata = this._metadata;
        }

        return result;
    }

    private validateName(name: string): void {
        const pattern = /^[A-Z0-9_]+$/;

        if (!pattern.test(name)) {
            throw new ValidationError(
                'name',
                name,
                `Invalid UserDefinedEnum name: "${name}". Must be UPPER_SNAKE_CASE (e.g., MY_ENUM_VALUE).`,
                '^[A-Z0-9_]+$'
            );
        }
    }
}
