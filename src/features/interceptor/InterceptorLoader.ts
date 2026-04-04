import * as DomainModule from '@todo-requirement-blueprint/domain';
import type { Node } from '@todo-requirement-blueprint/domain';

import type { NodeInterceptor } from './NodeInterceptor';
import { GitHubClient } from '../github/GitHubClient';


export class InterceptorLoader {
    private static readonly _TYPE_SCRIPT_FILE_PATTERN: RegExp = /\.(ts|tsx|mts|cts)$/i;
    private static readonly _DOMAIN_MODULE_NAME: string = '@todo-requirement-blueprint/domain';

    public static async load(
        owner: string,
        repoName: string,
        scriptPath: string
    ): Promise<NodeInterceptor | null> {
        try {
            const scriptContent: string | null = await GitHubClient.instance.getFileContent(
                owner,
                repoName,
                scriptPath
            );

            if (!scriptContent) {
                console.warn('[InterceptorLoader] Interceptor script not found:', scriptPath);
                return null;
            }

            const executableScriptContent: string | null = await InterceptorLoader._prepareExecutableScript(
                scriptContent,
                scriptPath
            );

            if (!executableScriptContent) {
                return null;
            }

            return InterceptorLoader._createInterceptorFunction(executableScriptContent);
        } catch (error) {
            console.error('[InterceptorLoader] Failed to load interceptor script:', (error as Error).message);
            return null;
        }
    }

    private static async _prepareExecutableScript(
        scriptContent: string,
        scriptPath: string
    ): Promise<string | null> {
        if (!InterceptorLoader._TYPE_SCRIPT_FILE_PATTERN.test(scriptPath)) {
            return scriptContent;
        }

        return await InterceptorLoader._transpileTypeScriptScript(scriptContent, scriptPath);
    }

    private static async _transpileTypeScriptScript(
        scriptContent: string,
        scriptPath: string
    ): Promise<string | null> {
        try {
            const typeScriptModule: typeof import('typescript') = await import('typescript');

            const transpileResult: import('typescript').TranspileOutput = typeScriptModule.transpileModule(
                scriptContent,
                {
                    fileName: scriptPath,
                    reportDiagnostics: true,
                    compilerOptions: {
                        target: typeScriptModule.ScriptTarget.ES2020,
                        module: typeScriptModule.ModuleKind.CommonJS,
                        strict: false
                    }
                }
            );

            const diagnostics: import('typescript').Diagnostic[] = transpileResult.diagnostics || [];

            const errorDiagnostics: import('typescript').Diagnostic[] = diagnostics.filter(
                (diagnostic: import('typescript').Diagnostic): boolean =>
                    diagnostic.category === typeScriptModule.DiagnosticCategory.Error
            );

            if (errorDiagnostics.length > 0) {
                const errorMessage: string = typeScriptModule.flattenDiagnosticMessageText(
                    errorDiagnostics[0].messageText,
                    '\n'
                );

                console.error('[InterceptorLoader] TypeScript transpilation failed:', errorMessage);

                return null;
            }

            return transpileResult.outputText;
        } catch (error) {
            console.error('[InterceptorLoader] Failed to transpile TypeScript interceptor script:', error);

            return null;
        }
    }

    private static _createModuleRequire(): (moduleName: string) => unknown {
        return (moduleName: string): unknown => {
            if (moduleName === InterceptorLoader._DOMAIN_MODULE_NAME) {
                return DomainModule;
            }

            throw new Error(`[InterceptorLoader] Unsupported module import: ${moduleName}`);
        };
    }

    private static _createInterceptorFunction(scriptContent: string): NodeInterceptor {
        const wrappedScript: string = `
            const exports = {};
            const module = { exports };
            ${scriptContent}

            if (typeof intercept === 'function') {
                return intercept;
            }

            if (typeof module.exports === 'function') {
                return module.exports;
            }

            if (module.exports && typeof module.exports.intercept === 'function') {
                return module.exports.intercept;
            }

            if (module.exports && typeof module.exports.default === 'function') {
                return module.exports.default;
            }

            if (typeof exports.intercept === 'function') {
                return exports.intercept;
            }

            if (typeof exports.default === 'function') {
                return exports.default;
            }

            return function(node) { return node; };
        `;

        try {
            const createInterceptor:
                (requireFunction: (moduleName: string) => unknown) => unknown =
                    new Function('require', wrappedScript) as (requireFunction: (moduleName: string) => unknown) => unknown;

            const interceptorCandidate: unknown = createInterceptor(InterceptorLoader._createModuleRequire());

            const interceptor: NodeInterceptor = typeof interceptorCandidate === 'function'
                ? interceptorCandidate as NodeInterceptor
                : ((node: Node): Node => node);

            return (node: Node): Node => {
                try {
                    const result: Node = interceptor(node);

                    if (result && typeof result === 'object') {
                        return result;
                    }

                    console.warn('[InterceptorLoader] Interceptor did not return a valid node, using original');
                    return node;
                } catch (interceptError) {
                    console.error('[InterceptorLoader] Interceptor execution error:', interceptError);
                    return node;
                }
            };
        } catch (parseError) {
            console.error('[InterceptorLoader] Failed to parse interceptor script:', parseError);

            return (node: Node): Node => node;
        }
    }
}
