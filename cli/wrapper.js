// Runs if we're being executed by node, otherwise does nothing.
export async function wrapper(argv, templateFn, importUrl) {
  if (!argv || !templateFn || importUrl == null) return
  try {
    const realPath = await (await import("node:fs/promises")).realpath(argv[1]);
    const realPathAsUrl = (await import("node:url")).pathToFileURL(realPath).href;
    if (!(importUrl === realPathAsUrl)) return;
  } catch (_) {
    return;
  }
  await (await import('./executor.js')).default(argv.slice(2), templateFn)
}
