import Handlebars from 'handlebars'
import { objectHasOwn } from './ts-extras.js'

import fm from './front-matter.js'
import { flavors, labels, accents, type FlavorName } from './catppuccin.js'
import { decodeUnquote } from './helpers/unquote.js'
import { WhiskersHelpers, WhiskersKnownHelpers } from './helpers/index.js'
import { SourceNode } from 'source-map'


export interface WhiskersRuntimeOptions extends Handlebars.RuntimeOptions {
  flavor?: FlavorName
}

export interface WhiskersTemplateDelegate<T = any> {
  (context: T, options?: WhiskersRuntimeOptions): string;
}

export interface FrontMatterAnnotated {
  "{{whiskersFrontmatter}}"?: object
}

function wrapTemplateFunction<T = any>(callable: Handlebars.TemplateDelegate<T>, frontmatter?: {}): WhiskersTemplateDelegate<T> {
  return new Proxy(callable, {
    apply(target, thisArg, argumentsList) {
      const context = argumentsList[0]
      const runtimeOptions: WhiskersRuntimeOptions | undefined = argumentsList[1]

      const flavorContext = runtimeOptions?.flavor == null ? {} : flavors[runtimeOptions.flavor]
      const whiskersContext = {
        flavors,
        labels,
        accents,
        ...flavors,
        flavor: runtimeOptions?.flavor,
        ...flavorContext,
        ...(frontmatter ?? {}),
        ...context
      }

      if (runtimeOptions != null && objectHasOwn(runtimeOptions, "flavor")) {
        delete runtimeOptions["flavor"]
      }

      return decodeUnquote(Reflect.apply(target, thisArg, [whiskersContext, runtimeOptions]))
    }
  })
}


function fakeExtendObject<B extends object, E extends object>(base: B, extended: E): B & E {
  return Object.assign(base, extended, Object.fromEntries(
    Object
      .keys(extended)
      .filter(key => key in base)
      // @ts-ignore
      .map(key => ["_super_" + key, base[key]])
  ))
}

declare namespace _HandlebarsExtras {
  interface PrecompileOptionsWithMap extends PrecompileOptions {
    srcName: string
  }

  interface PrecompileOptionsNoMap extends PrecompileOptions {
    srcName: undefined
  }

  interface PrecompileWithMapResult {
    code: string
    map: string
  }

  export function precompile(input: string, options: PrecompileOptionsWithMap): PrecompileWithMapResult
  export function precompile(input: string, options: PrecompileOptionsNoMap | undefined): string


  class Compiler {
    compile(input: any, options?: CompileOptions): any
  }

  class JavaScriptCompiler {
    isChild: boolean
    srcFile?: string | null

    compile(environment: any, options: CompileOptions, context: any, asObject: boolean): any
    objectLiteral(obj: object): any
  }
}

export type HandlebarsEnv = typeof Handlebars & typeof _HandlebarsExtras

export type WhiskersEnv = HandlebarsEnv & {
  "{{whiskersRegistered}}": true

  template<T = any>(spec: FrontMatterAnnotated): WhiskersTemplateDelegate<T>
  compile<T = any>(input: string, options?: CompileOptions): WhiskersTemplateDelegate<T>

  parse(input: string, options?: CompileOptions): FrontMatterAnnotated
  create(): WhiskersEnv
}

/**
 * Register Whiskers helpers and context to an existing Handlebars environment.
 *
 * @param handlebarsEnv - an existing Handlebars environment, either the default exported `Handlebars`, an isolated
 * environment from `Handlebars.create()`, or an environment from another package.
 *
 * @returns The existing environment `handlebarsEnv` for chaining
 */
export function registerWhiskers(handlebarsEnv: HandlebarsEnv | WhiskersEnv): WhiskersEnv {
  if ("{{whiskersRegistered}}" in handlebarsEnv && handlebarsEnv["{{whiskersRegistered}}"]) {
    return handlebarsEnv as WhiskersEnv
  }

  const whiskersEnv: WhiskersEnv = fakeExtendObject(handlebarsEnv, {
    "{{whiskersRegistered}}": true as true,

    template<T = any>(spec: FrontMatterAnnotated): WhiskersTemplateDelegate<T> {
      // @ts-ignore
      const template = this._super_template(spec)

      return wrapTemplateFunction<T>(template, spec["{{whiskersFrontmatter}}"])
    },

    create(): WhiskersEnv {
      // @ts-ignore
      return registerWhiskers(this._super_create())
    },

    parse(input: string, options?: CompileOptions): FrontMatterAnnotated {
      const { attributes, body } = fm<object>(input)
      // @ts-ignore
      const ast = this._super_parse(body, options)
      return Object.assign(ast, {
        "{{whiskersFrontmatter}}": attributes
      })
    },

    Compiler: class extends handlebarsEnv.Compiler implements FrontMatterAnnotated {
      "{{whiskersFrontmatter}}"?: object

      compile(input: FrontMatterAnnotated, options: CompileOptions): FrontMatterAnnotated {
        options.knownHelpers = {
          ...WhiskersKnownHelpers,
          ...(options.knownHelpers ?? {}),
        }
        this["{{whiskersFrontmatter}}"] = input["{{whiskersFrontmatter}}"]
        return super.compile(input, options)
      }
    },

    JavaScriptCompiler: class extends handlebarsEnv.JavaScriptCompiler implements FrontMatterAnnotated {
      "{{whiskersFrontmatter}}"?: object

      compile(environment: FrontMatterAnnotated, options: CompileOptions, context: any, asObject: boolean) {
        if (!this.isChild) {
          if (asObject) {
            const templateSpec = super.compile(environment, options, context, asObject)
            templateSpec["{{whiskersFrontmatter}}"] = environment["{{whiskersFrontmatter}}"]
            return templateSpec
          } else {
            this["{{whiskersFrontmatter}}"] = environment["{{whiskersFrontmatter}}"]
          }
        }
        return super.compile(environment, options, context, asObject)
      }

      objectLiteral(obj: object) {
        if (this["{{whiskersFrontmatter}}"] != null && objectHasOwn(obj, "main") && objectHasOwn(obj, "compiler")) {
          const whiskersFrontmatter = new SourceNode(
            0, 0, this.srcFile ?? null, JSON.stringify(this["{{whiskersFrontmatter}}"]))
          return super.objectLiteral({
            ...obj,
            "{{whiskersFrontmatter}}": whiskersFrontmatter,
          })
        } else {
          return super.objectLiteral(obj)
        }
      }
    }
  })

  whiskersEnv.registerHelper(WhiskersHelpers)

  return whiskersEnv
}

export const RootHandlebars = Handlebars as HandlebarsEnv
