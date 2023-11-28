import { type SourceNode } from "source-map"

const isSourceNode = "$$$isSourceNode$$$"

export type InternalSourceNode = SourceNode & {
  [isSourceNode]: true
  children: (string | InternalSourceNode)[]
  line?: number
  column?: number
}

export function offsetSourceNode(
  node: InternalSourceNode,
  line: number,
  column: number,
  visitedSet?: Set<InternalSourceNode>
): InternalSourceNode {
  visitedSet = visitedSet ?? new Set<InternalSourceNode>()

  if (node.line != null) node.line += line - 1
  if (node.column != null) node.column += column

  visitedSet.add(node)

  for (const chunk of node.children) {
    if (typeof chunk !== "string" && !visitedSet.has(chunk) && chunk[isSourceNode]) {
      offsetSourceNode(chunk, line, column, visitedSet)
    }
  }

  return node
}
