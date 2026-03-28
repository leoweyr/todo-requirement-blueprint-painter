import type { Node } from '@todo-requirement-blueprint/domain';

import type { NodeInterceptor } from './NodeInterceptor';
import { GitHubClient } from '../github/GitHubClient';


export class InterceptorLoader {
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

            return InterceptorLoader._createInterceptorFunction(scriptContent);
        } catch (error) {
            console.error('[InterceptorLoader] Failed to load interceptor script:', (error as Error).message);
            return null;
        }
    }

    private static _createInterceptorFunction(scriptContent: string): NodeInterceptor {
        // Wrap the user script in a function that returns the interceptor.
        // The user script is expected to define an 'intercept' function.
        const wrappedScript: string = `
            ${scriptContent}
            return typeof intercept === 'function' ? intercept : function(node) { return node; };
        `;

        try {
            // Create a sandboxed function using new Function().
            // This is safer than eval() but still allows user-defined logic.
            const createInterceptor: () => NodeInterceptor = new Function(wrappedScript) as () => NodeInterceptor;
            const interceptor: NodeInterceptor = createInterceptor();

            // Return a wrapper that ensures the interceptor returns a valid node.
            return (node: Node): Node => {
                try {
                    const result: Node = interceptor(node);

                    // Ensure the result is a valid node object.
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

            // Return a no-op interceptor on parse failure.
            return (node: Node): Node => node;
        }
    }
}
