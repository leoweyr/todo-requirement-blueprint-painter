import { ValidationError } from './exceptions/ValidationError';


export class UserDefinedEnum {
    private _name: string;
    private _description: string;

    constructor(name: string, description: string) {
        this.validateName(name);

        this._name = name;
        this._description = description;
    }

    public get name(): string {
        return this._name;
    }

    public get description(): string {
        return this._description;
    }

    public toObject(): { name: string; description: string } {
        return {
            name: this._name,
            description: this._description
        };
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
