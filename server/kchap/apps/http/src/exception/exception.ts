export class Exception extends Error {
    constructor(message?: string, payload?: {}) {
        super(message);
    }
} 