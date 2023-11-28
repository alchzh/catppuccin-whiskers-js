// Runs if we're being executed by node, otherwise does nothing.
export async function wrapper(argv, templateFn) {
  if (!argv || !templateFn) return
  try {
    const realPath = await (await import("node:fs/promises")).realpath(argv[1]);
    const realPathAsUrl = (await import("node:url")).pathToFileURL(realPath).href;
    if (!import.meta.url === realPathAsUrl) return;
  } catch (_) {
    return;
  }
  await (await import('./executor.js')).default(argv.slice(2), templateFn)
}
