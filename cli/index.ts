import type { ParsedArgs } from "minimist"
import { objectHasOwn } from "../lib/ts-extras.js"

type ArgSpec = {
  type: "boolean" | "string"
  description: string
  arg?: string
  default?: any
  alias?: string
}

type PositionalArgSpec = ArgSpec & {
  arg: string,
  required: boolean,
  multiple?: boolean
}

type Spec = {
  [name: string]: ArgSpec
}

type DisplayInfo = {
  name: string
  arg?: string
  desc: string
  meta: string
}

export class WhiskersCliError extends Error { }

// https://stackoverflow.com/a/54565854
export async function readStream(stream: NodeJS.ReadStream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export async function loadArgs(argv: string[], spec: Spec): Promise<ParsedArgs> {
  const opts = {
    alias: <{[name: string]: string}>{},
    boolean: <string[]>[],
    default: <{[name: string]: any}>{},
    string: <string[]>[]
  };

  for (const [arg, opt] of Object.entries(spec)) {
    opts[opt.type].push(arg);
    if (opt['alias'])
      opts.alias[arg] = opt.alias;
    if (objectHasOwn(opt, 'default'))
      opts.default[arg] = opt.default;
  }

  const args = (await import("minimist")).default(argv, opts);

  return args
}

export async function printSubcommandUsage(
  command: string,
  commandDesc: string,
  spec: Spec,
  positionalArgs: PositionalArgSpec[],
  wrap?: number
) {
  wrap = Math.max(process.stdout.columns, wrap ?? 80)
  const wordwrap = (await import('wordwrap')).default;

  console.log(commandDesc);
  const positionalArgsLine = positionalArgs.map(fmtPositionalArg).join(" ")
  console.log(`Usage: ${command} ${positionalArgsLine}`);

  let argWidth = 0
  const argsDisp: DisplayInfo[] = [];
  if (positionalArgs.length) {
    for (const arg of positionalArgs) {
      const fmtd = fmtPositionalArg(arg)
      argsDisp.push({ name: fmtd, desc: arg.description, meta: "" });
      if (fmtd.length > argWidth) argWidth = fmtd.length;
    }
  }

  let optWidth = 0
  const optsDisp: DisplayInfo[] = [];
  for (const [arg, opt] of Object.entries(spec)) {
    let name = (arg.length === 1 ? '-' : '--') + arg;
    if ('alias' in opt) name += ', --' + opt.alias;
    if ('arg' in opt) name += ` [${opt.arg}]`;

    let meta = '[' + opt.type + ']';
    if (opt.default) meta = `[default: ${opt.default}] ${meta}]`
    optsDisp.push({ name: name, desc: opt.description, meta: meta });
    if (name.length > optWidth) optWidth = name.length;
  }

  if (argsDisp.length) {
    console.log('Arguments:')
    display(argsDisp, argWidth, wrap, wordwrap)
  }
  console.log('Options:');
  display(optsDisp, optWidth, wrap, wordwrap)
}

function display(dispInfo: DisplayInfo[], width: number, wrap: number, wordwrap: any) {
  for (const opt of dispInfo) {
    const desc = wordwrap(width + 4, wrap + 1)(opt.desc);

    console.log('  %s%s%s%s%s',
      opt.name,
      pad(width - opt.name.length + 2),
      desc.slice(width + 4),
      // @ts-ignore
      pad(wrap - opt.meta.length - desc.split(/\n/).pop().length),
      opt.meta
      )
  }
}

function fmtPositionalArg(a: PositionalArgSpec): string {
  return (a.required ? a.arg : `[${a.arg}]`) + (a.multiple ? "..." : "")
}

function pad(n: number) {
  var str = '';
  while (str.length < n) {
    str += ' ';
  }
  return str;
}
