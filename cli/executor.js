import { readStream, WhiskersCliError, loadArgs, printSubcommandUsage } from "./index.js"
import { writeFile, readFile } from "node:fs/promises"
import { basename } from "node:path"

export default async function commandExecute(argv, templateFn) {
  const spec = {
    'override': {
      'type': 'string',
      'description': 'The overrides to apply to the template in key=value format',
      'arg': 'OVERRIDES',
    },
    'o': {
      'type': 'string',
      'description': 'Path to write to instead of stdout',
      'alias': 'output-path'
    },
    'U': {
      'type': 'boolean',
      'description': "DON'T run in strict mode. Templates will fail silently rather than throw on missing fields.",
      'alias': 'unstrict'
    },
    'h': {
      'type': 'boolean',
      'description': 'Print this help message',
      'alias': 'help'
    }
  }

  const positionalSpec = [
    {
      arg: "TEMPLATE",
      description: "Path to the template file to render, or `-` for stdin",
      multiple: false,
      required: true,
    },
    {
      arg: "FLAVOR",
      description: "Flavor to get colors from [possible values: latte, frappe, macchiato, mocha]. If missing, no flavor context will be supplied to the template.",
      multiple: false,
      required: false,
    }
  ]
  const args = await loadArgs(argv, spec)
  if (args.help || args._.length < !templateFn) {
    if (templateFn) {
      await printSubcommandUsage(
        './' + basename(process.argv[1]),
        'Render this compiled Whiskers template',
        spec,
        positionalSpec.slice(1)
      )
    } else {
      await printSubcommandUsage(
        'whiskers-js render',
        'Render a Whiskers template',
        spec,
        positionalSpec
      )
    }
    process.exit(+!args.help)
  }

  args.flavor = args._[+!templateFn]
  if (!args.flavor && !args.unstrict) {
    console.warn("Warning: no flavor provided. References to flavor colors will fail unless precompiled in unstrict mode.")
  }
  const { default: Whiskers, Catppuccin } = await import("../index.js")
  if (args.flavor && !Object.prototype.hasOwnProperty.call(Catppuccin.flavors, args.flavor)) {
    throw new WhiskersCliError(`Unknown flavor ${args.flavor}`)
  }
  const overrideStrings = typeof args.override === "string" ? [args.override] : args.override
  const overrides = {}
  for (const str of overrideStrings ?? []) {
    const split = str.match(/^.*?=.*$/g)
    if (!split || split.length != 2) {
      throw new WhiskersCliError("Overrides must be in the form KEY=VALUE")
    }
    overrides[split[0]] = split[1]
  }

  if (!templateFn) {
    templateFn = Whiskers.compile(await loadTemplate(args._[0]), { strict: !args.unstrict })
  }

  const result = templateFn(overrides, { strict: true, flavor: args.flavor })
  if (args.output) {
    try {
      await writeFile(args.output, result, "utf-8")
    } catch (err) {
      throw new WhiskersCliError(`Unable to write to output path "${args.output}"`)
    }
  } else {
    process.stdout.write(result, "utf8")
  }
}

async function loadTemplate(templatePath) {
  if (templatePath === "-") {
    return await readStream(process.stdin)
  }

  try {
    return await readFile(templatePath, "utf-8")
  } catch (err) {
    throw new WhiskersCliError(`Unable to read template file "${templatePath}"`)
  }
}
