import type { Node } from '@todo-requirement-blueprint/domain';

export type NodeInterceptor = (node: Node) => Node;
