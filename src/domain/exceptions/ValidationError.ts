export class ValidationError extends Error {
    public readonly field: string;
    public readonly value: any;
    public readonly pattern?: string;

    constructor(field: string, value: any, message: string, pattern?: string) {
        super(message);

        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
        this.pattern = pattern;
        
        // Restore prototype chain for instanceof checks.
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
