export type SplitResult = {
  frontMatter?: string
  body: string
  /** The line of the file the body begins on, 1-indexed. */
  bodyBegin: number
}

/**
 * Splits a template into a front matter template and body template
 *
 * Unlike in whiskers, we don't trim whitespace at the beginning and
 * end before parsing
 */
export function split(template: string): SplitResult {
  const headPattern = /^---\s*?\r?\n/g
  if (!headPattern.test(template)) {
    return { body: template, bodyBegin: 1}
  }
  const rest = template.slice(headPattern.lastIndex)
  const tail = rest.match(/^---\s*\r?\n/m)
  if (!tail) {
    return { body: template, bodyBegin: 1}
  }
  const frontMatter = rest.slice(0, tail.index)
  let bodyBegin = 2
  bodyBegin += frontMatter.match(/\r?\n/g)?.length ?? 0
  bodyBegin += tail[0]?.match(/\r?\n/g)?.length ?? 0
  return {
    frontMatter,
    // @ts-ignore TypeScript doesn't know we don't have global set
    body: rest.slice(tail.index + tail[0].length),
    bodyBegin: bodyBegin
  }
}
