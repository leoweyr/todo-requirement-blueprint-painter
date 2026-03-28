export class ReadOnlyView {
    private static _instance: ReadOnlyView;

    public static get instance(): ReadOnlyView {
        if (!ReadOnlyView._instance) {
            ReadOnlyView._instance = new ReadOnlyView();
        }

        return ReadOnlyView._instance;
    }

    private readonly _isReadOnly: boolean;

    private constructor() {
        // Check if ?github= parameter exists in the URL.
        const urlParameters: URLSearchParams = new URLSearchParams(window.location.search);
        const githubParameter: string | null = urlParameters.get('github');

        this._isReadOnly = githubParameter !== null && githubParameter.length > 0;
    }

    public isReadOnly(): boolean {
        return this._isReadOnly;
    }
}
