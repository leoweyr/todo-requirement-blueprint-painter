import type { Node } from '../../domain/Node';

export type NodeInterceptor = (node: Node) => Node;
