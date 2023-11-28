#!/usr/bin/env node

const argv = process.argv

if (argv[2] == "compile") {
  import("./precompiler.js")
    .then(c => c.default(argv.slice(3)))
} else if (argv[2] == "render") {
  import("./executor.js")
    .then(c => c.default(argv.slice(3)))
} else {
  printUsage()
}

function printUsage() {
  console.error('Usage: whiskers-js [compile|render] ...')
  console.error('Do --help on a subcommand to see usage info')
  process.exit(1)
}
