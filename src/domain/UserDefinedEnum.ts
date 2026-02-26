export class UserDefinedEnum {
    private _name: string;
    private _description: string;

    constructor(name: string, description: string) {
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
}
