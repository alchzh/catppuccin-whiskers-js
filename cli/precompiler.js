// Modified from handlebars/lib/precompiler.js
export async function commandPrecompile(argv) {
  const spec = {
    'f': {
      'type': 'string',
      'description': 'Output File',
      'alias': 'output'
    },
    'map': {
      'type': 'string',
      'description': 'Source Map File'
    },
    'esm': {
      'type': 'string',
      'description': 'Exports to ESM style',
      'default': true
    },
    'esm-import': {
      'type': 'string',
      'description': 'Overrides the Whiskers import path in ESM export mode',
      'default': 'catppuccin-whiskers-js'
    },
    'export': {
      'type': 'boolean',
      'description': 'Used with --esm to generate an importable module file with the template function default exported.',
      'default': false
    },
    'k': {
      'type': 'string',
      'description': 'Known helpers',
      'alias': 'known'
    },
    'o': {
      'type': 'boolean',
      'description': 'Known helpers only',
      'alias': 'knownOnly'
    },
    'm': {
      'type': 'boolean',
      'description': 'Minimize output',
      'alias': 'min'
    },
    'n': {
      'type': 'string',
      'description': 'Template namespace',
      'alias': 'namespace',
      'default': 'Whiskers.templates'
    },
    's': {
      'type': 'boolean',
      'description': 'Output template function only.',
      'alias': 'simple'
    },
    'N': {
      'type': 'string',
      'description': 'Name of passed string templates. Optional if running in a simple mode. Required when operating on multiple templates.',
      'alias': 'name'
    },
    'i': {
      'type': 'string',
      'description': 'Generates a template from the passed CLI argument.\n"-" is treated as a special value and causes stdin to be read for the template value.',
      'alias': 'string'
    },
    'r': {
      'type': 'string',
      'description': 'Template root. Base value that will be stripped from template names.',
      'alias': 'root'
    },
    'p': {
      'type': 'boolean',
      'description': 'Compiling a partial template',
      'alias': 'partial'
    },
    'd': {
      'type': 'boolean',
      'description': 'Include data when compiling',
      'alias': 'data'
    },
    'e': {
      'type': 'string',
      'description': 'Template extension.',
      'alias': 'extension',
      'default': 'handlebars'
    },
    'b': {
      'type': 'boolean',
      'description': 'Removes the BOM (Byte Order Mark) from the beginning of the templates.',
      'alias': 'bom'
    },
    'v': {
      'type': 'boolean',
      'description': 'Prints the current compiler version',
      'alias': 'version'
    },
    'help': {
      'type': 'boolean',
      'description': 'Outputs this message'
    }
  }

  const opts = { alias: {}, boolean: [], default: {}, string: [] };

  for (const [arg, opt] of Object.entries(spec)) {
    opts[opt.type].push(arg);
    if ('alias' in opt) opts.alias[arg] = opt.alias;
    if ('default' in opt) opts.default[arg] = opt.default;
  }

  const args = (await import("minimist")).default(argv, opts);
  args._spec = spec;

  args.files = args._;
  delete args._;

  await loadTemplates(args)

  if (args.help || (!args.templates.length && !args.version)) {
    printUsage(args._spec, 120);
  } else {
    cli(args);
  }
}

function pad(n) {
  var str = '';
  while (str.length < n) {
    str += ' ';
  }
  return str;
}

async function printUsage(spec, wrap) {
  var wordwrap = (await import('wordwrap')).default;

  console.log('Precompile whiskers templates.');
  console.log('Usage: whiskers-js precompile [template|directory]...');

  var opts = [];
  var width = 0;
  Object.keys(spec).forEach(function (arg) {
    var opt = spec[arg];

    var name = (arg.length === 1 ? '-' : '--') + arg;
    if ('alias' in opt) name += ', --' + opt.alias;

    var meta = '[' + opt.type + ']';
    if ('default' in opt) meta += ' [default: ' + JSON.stringify(opt.default) + ']';

    opts.push({ name: name, desc: opt.description, meta: meta });
    if (name.length > width) width = name.length;
  });

  console.log('Options:');
  opts.forEach(function (opt) {
    var desc = wordwrap(width + 4, wrap + 1)(opt.desc);

    console.log('  %s%s%s%s%s',
      opt.name,
      pad(width - opt.name.length + 2),
      desc.slice(width + 4),
      pad(wrap - opt.meta.length - desc.split(/\n/).pop().length),
      opt.meta
      );
  });
}

export async function loadTemplates(opts) {
  const strings = await loadStrings(opts)
  const files = await loadFiles(opts)
  opts.templates = strings.concat(files);
  return opts
}

// https://stackoverflow.com/a/54565854
async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function loadStrings(opts) {
  let strings = arrayCast(opts.string),
    names = arrayCast(opts.name);

  if (names.length !== strings.length && strings.length > 1) {
    throw new Whiskers.Exception(
      'Number of names did not match the number of string inputs'
    )
  }

  return await Promise.all(strings.map(async (string, index) => ({
    name: names[index],
    path: names[index],
    source: string !== '-' ? string : await readStream(process.stdin)
  })))
}

async function loadFiles(opts) {
  const fsPromises = await import("node:fs/promises")
  const { default: Whiskers } = await import("../index.js")

  // Build file extension pattern
  let extension = (opts.extension || 'handlebars').replace(
    /[\\^$*+?.():=!|{}\-[\]]/g,
    function (arg) {
      return '\\' + arg;
    }
  );
  extension = new RegExp('\\.' + extension + '$');

  let ret = [],
    queue = (opts.files || []).map(template => ({ template, root: opts.root }));

  while (queue.length) {
    let { template: path, root } = queue.shift();
    let stat;
    try {
      stat = await fsPromises.stat(path)
    } catch (err) {
      throw new Whiskers.Exception(`Unable to open template file "${path}"`)
    }

    if (stat.isDirectory()) {
      opts.hasDirectory = true;

      let children = fs.readdir(path)

      children.forEach(function (file) {
        let childPath = path + '/' + file;

        if (
          extension.test(childPath) ||
          fs.statSync(childPath).isDirectory()
        ) {
          queue.push({ template: childPath, root: root || path });
        }
      })
    } else {
      const data = await fsPromises.readFile(path, 'utf-8')

      if (opts.bom && data.indexOf('\uFEFF') === 0) {
        data = data.substring(1);
      }
      let name = path;
      if (!root) {
        name = (await import("path")).basename(name);
      } else if (name.indexOf(root) === 0) {
        name = name.substring(root.length + 1);
      }
      name = name.replace(extension, '');

      ret.push({
        path: path,
        name: name,
        source: data
      });
    }
  }

  return ret
}

export async function cli(opts) {
  const { default: Whiskers } = await import("../index.js")

  if (opts.version) {
    console.log(Whiskers.VERSION);
    return;
  }

  if (!opts.templates.length && !opts.hasDirectory) {
    throw new Whiskers.Exception(
      'Must define at least one template or directory.'
    );
  }

  if (opts.simple && opts.min) {
    throw new Whiskers.Exception('Unable to minimize simple output');
  }

  const multipleIn = opts.templates.length !== 1 || opts.hasDirectory;
  if (opts.export) {
    opts.esm = true;
    if (opts.simple || multipleIn) {
      throw new Whiskers.Exception('--export can only be used with ESM output for a single file');
    }
  }
  if (opts.simple && multipleIn) {
    throw new Whiskers.Exception(
      'Unable to output multiple templates in simple mode'
    );
  }

  // Force simple mode if we have only one template and it's unnamed.
  opts.simple ||= (
    !opts.esm &&
    opts.templates.length === 1 &&
    !opts.templates[0].name
  )

  // Convert the known list into a hash
  let known = {};
  if (opts.known && !Array.isArray(opts.known)) {
    opts.known = [opts.known];
  }
  if (opts.known) {
    for (let i = 0, len = opts.known.length; i < len; i++) {
      known[opts.known[i]] = true;
    }
  }

  const objectName = opts.partial ? 'Whiskers.partials' : 'templates';

  const { SourceNode, SourceMapConsumer } = await import("source-map")
  let output = new SourceNode();
  if (!opts.simple) {
    if (opts.esm) {
      output.add('import Whiskers from "' + opts['esm-import'] + '";');
    } else {
      output.add('(function() {\n');
    }
    output.add('  var template = Whiskers.template, templates = ');
    if (opts.namespace) {
      output.add(opts.namespace);
      output.add(' = ');
      output.add(opts.namespace);
      output.add(' || ');
    }
    output.add('{};\n');
  }

  for await (const template of opts.templates) {
    let options = {
      knownHelpers: known,
      knownHelpersOnly: opts.o
    };

    if (opts.map) {
      options.srcName = template.path;
    }
    if (opts.data) {
      options.data = true;
    }

    let precompiled = Whiskers.precompile(template.source, options);

    // If we are generating a source map, we have to reconstruct the SourceNode object
    if (opts.map) {
      let consumer = await new SourceMapConsumer(precompiled.map);
      precompiled = SourceNode.fromStringWithSourceMap(
        precompiled.code,
        consumer
      );
    }

    if (opts.simple) {
      output.add([precompiled, '\n']);
    } else {
      if (opts.export) {
        output.add("var compiledFn = ");
      } else {
        if (!template.name) {
          throw new Whiskers.Exception('Name missing for template');
        }
      }

      if (template.name) {
        output.add(
          objectName,
          "['",
          template.name,
          "'] = "
        )
      }

      output.add([
        "template(",
        precompiled,
        ');\n'
      ]);
    }
  }

  if (!opts.simple) {
    if (opts.esm) {
      if (opts.export) {
        output.add("export default compiledFn;")
      }
    } else {
      output.add('})();');
    }
  }

  if (opts.map) {
    output.add('\n//# sourceMappingURL=' + opts.map + '\n');
  }

  output = output.toStringWithSourceMap();
  output.map = output.map + '';

  if (opts.min) {
    output = await minify(output, opts.map);
  }

  const { writeFile } = await import("node:fs/promises")
  if (opts.map) {
    await writeFile(opts.map, output.map, 'utf8');
  }
  output = output.code;

  if (opts.output) {
    await writeFile(opts.output, output, 'utf8');
  } else {
    console.log(output);
  }
};

function arrayCast(value) {
  value = value != null ? value : [];
  if (!Array.isArray(value)) {
    value = [value];
  }
  return value;
}

/**
 * Run uglify to minify the compiled template, if uglify exists in the dependencies.
 *
 * We are using `require` instead of `import` here, because es6-modules do not allow
 * dynamic imports and uglify-js is an optional dependency. Since we are inside NodeJS here, this
 * should not be a problem.
 */
async function minify(output, sourceMapFile) {
  let uglify;

  try {
    // Try to resolve uglify-js in order to see if it does exist
    uglify = (await import('uglify-js')).minify;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      // Something else seems to be wrong
      throw e;
    }
    // it does not exist!
    console.error(
      'Code minimization is disabled due to missing uglify-js dependency'
    );
    return output;
  }

  return uglify(output.code, {
    sourceMap: {
      content: output.map,
      url: sourceMapFile
    }
  });
}
