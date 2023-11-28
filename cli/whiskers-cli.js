#!/usr/bin/env node

const argv = process.argv
if (argv.length >= 3 && argv[2] == "precompile") {
  import("./precompiler.js")
    .then(c => c.commandPrecompile(argv.slice(3)))
} else {
  console.error('Usage: whiskers-js [precompile|execute]...')
  process.exit(1)
}
