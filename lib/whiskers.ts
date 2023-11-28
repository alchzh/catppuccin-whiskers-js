import Handlebars from 'handlebars'
import { objectHasOwn } from './ts-extras.js'
import yaml from 'js-yaml'

import { split } from './front-matter.js'
import { flavors, labels, accents, type FlavorName } from './catppuccin.js'
import { decodeUnquote } from './helpers/unquote.js'
import { WhiskersHelpers, WhiskersKnownHelpers } from './helpers/index.js'
import { SourceMapConsumer, SourceNode, type RawSourceMap } from 'source-map'
import { offsetSourceNode, type InternalSourceNode } from './source-map.js'


export interface WhiskersRuntimeOptions extends Handlebars.RuntimeOptions {
  flavor?: FlavorName
}

export interface WhiskersTemplateDelegate<T = any> {
  (context: T, options?: WhiskersRuntimeOptions): string;
}

export type FrontMatterAnnotated<T> = {
  "{{whiskersFrontmatter}}"?: T
  "{{whiskersBodyBegin}}"?: number
}

function wrapTemplateFunction<T = any>(
  callable: Handlebars.TemplateDelegate<T>,
  frontMatter?: Handlebars.TemplateDelegate<T>
): WhiskersTemplateDelegate<T> {
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
        ...context
      }

      // Load the front matter which should be supplied as a function
      const frontMatterLoaded = frontMatter == null ? {} : yaml.load(
        Function.prototype.apply.call(
          frontMatter, thisArg, [whiskersContext, runtimeOptions]
        )
      )

      if (frontMatterLoaded != null) {
        const frontMatterIsObject = !Array.isArray(frontMatterLoaded) && typeof frontMatterLoaded == "object"
        Object.assign(whiskersContext, frontMatterIsObject ? frontMatterLoaded : { "this": frontMatterLoaded })
      }

      if (runtimeOptions != null && objectHasOwn(runtimeOptions, "flavor")) {
        delete runtimeOptions["flavor"]
      }

      return decodeUnquote(Reflect.apply(target, thisArg, [whiskersContext, runtimeOptions]))
    }
  })
}

function fakeExtendEnv<B extends object, E extends object>(base: B, extended: E): B & E {
  return Object.assign(base, extended)
}

declare namespace _HandlebarsExtras {
  export function precompile(input: string, options?: CompileOptions): string

  class Compiler {
    compile(input: any, options?: CompileOptions): Compiler
  }

  type MappedOutput = {
    code: string
    map: string
  }

  class JavaScriptCompiler {
    isChild: boolean
    srcFile?: string | null

    compile(environment: any, options: CompileOptions, context: any, asObject: true): TemplateSpecification
    compile(environment: any, options: CompileOptions, context: any, asObject: false): string | MappedOutput
    compile(environment: any, options: CompileOptions, context: any, asObject: boolean): TemplateSpecification | string

    objectLiteral(obj: object): any
  }
}

export type HandlebarsEnv = typeof Handlebars & typeof _HandlebarsExtras

type AnnotatedAST = ReturnType<typeof Handlebars.parse> & FrontMatterAnnotated<ReturnType<typeof Handlebars.parse>>
type AnnotatedCompiler = _HandlebarsExtras.Compiler & FrontMatterAnnotated<_HandlebarsExtras.Compiler>
type AnnotatedJavaScriptCompiler = _HandlebarsExtras.JavaScriptCompiler & FrontMatterAnnotated<string | SourceNode>
type TemplateSpecAnnotated = FrontMatterAnnotated<TemplateSpecification>
type AnnotatedTemplateSpec = TemplateSpecification & TemplateSpecAnnotated

export type WhiskersEnv = HandlebarsEnv & {
  "{{whiskersRegistered}}": true

  template<T = any>(spec: FrontMatterAnnotated<TemplateSpecification>): WhiskersTemplateDelegate<T>
  compile<T = any>(input: string, options?: CompileOptions): WhiskersTemplateDelegate<T>
  parse(input: string, options?: CompileOptions): AnnotatedAST
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

  const frontMatterEnv = Handlebars.create() as HandlebarsEnv

  const _super = {
    template: handlebarsEnv.template,
    parse: handlebarsEnv.parse
  }

  const whiskersEnv: WhiskersEnv = fakeExtendEnv(handlebarsEnv, {
    "{{whiskersRegistered}}": true as true,
    "{{frontMatterEnv}}": frontMatterEnv,

    template<T = any>(spec: FrontMatterAnnotated<TemplateSpecification>): WhiskersTemplateDelegate<T> {
      const fn = _super.template<T>(spec)
      const frontMatterFn = spec["{{whiskersFrontmatter}}"] && _super.template<T>(spec["{{whiskersFrontmatter}}"])

      return wrapTemplateFunction<T>(fn, frontMatterFn)
    },

    parse(input: string, options?: CompileOptions): AnnotatedAST {
      const { frontMatter, body, bodyBegin } = split(input)
      const bodyAst: AnnotatedAST = _super.parse(body, options)
      if (frontMatter != null) {
        bodyAst["{{whiskersFrontmatter}}"] = _super.parse(frontMatter, options)
      }
      bodyAst["{{whiskersBodyBegin}}"] = bodyBegin
      return bodyAst
    },

    Compiler: class WhiskersCompiler extends handlebarsEnv.Compiler
      implements AnnotatedCompiler {
      compile(program: AnnotatedAST, options: CompileOptions): AnnotatedCompiler {
        options.knownHelpers = {
          ...WhiskersKnownHelpers,
          ...(options.knownHelpers ?? {}),
        }
        const compiled: AnnotatedCompiler = super.compile(program, options)
        compiled["{{whiskersFrontmatter}}"] = program["{{whiskersFrontmatter}}"] &&
          new frontMatterEnv.Compiler().compile(
            program["{{whiskersFrontmatter}}"], options)
        compiled["{{whiskersBodyBegin}}"] = program["{{whiskersBodyBegin}}"]
        return compiled
      }
    },

    JavaScriptCompiler: class WhiskersJavascriptCompiler extends handlebarsEnv.JavaScriptCompiler {
      "{{whiskersFrontmatter}}"?: string | SourceNode
      "{{whiskersBodyBegin}}"?: number

      compile(environment: AnnotatedCompiler, options: CompileOptions, context: any, asObject: true):
        AnnotatedTemplateSpec;
      compile(environment: AnnotatedCompiler, options: CompileOptions, context: any, asObject: false): string;
      compile(environment: AnnotatedCompiler, options: CompileOptions, context: any, asObject: boolean) {
        if (!this.isChild && environment["{{whiskersFrontmatter}}"] != null) {
          if (asObject) {
            const templateSpec: AnnotatedTemplateSpec = super.compile(
              environment, options, context, true)
            templateSpec["{{whiskersFrontmatter}}"] = new frontMatterEnv.JavaScriptCompiler().compile(
              environment["{{whiskersFrontmatter}}"], options, context, true)
            return templateSpec
          } else {
            this["{{whiskersBodyBegin}}"] = environment["{{whiskersBodyBegin}}"]
            const precompiledFrontMatter = new frontMatterEnv.JavaScriptCompiler().compile(
              environment["{{whiskersFrontmatter}}"], options, context, false)
            if (typeof precompiledFrontMatter === "string") {
              // @ts-ignore
              this["{{whiskersFrontmatter}}"] = new SourceNode(1, 0, null, precompiledFrontMatter)
            } else {
              const frontMatterSourceNode = SourceNode.fromStringWithSourceMap(
                precompiledFrontMatter.code,
                new SourceMapConsumer(JSON.parse(precompiledFrontMatter.map) as RawSourceMap),
              ) as InternalSourceNode
              offsetSourceNode(frontMatterSourceNode, 2, 0)
              const templateSpecNode = frontMatterSourceNode.children[0] as InternalSourceNode
              templateSpecNode.line = 1
              this["{{whiskersFrontmatter}}"] = frontMatterSourceNode
            }
          }
        }
        return super.compile(environment, options, context, asObject)
      }

      objectLiteral(obj: object) {
        if (
          this["{{whiskersFrontmatter}}"] != null
          && objectHasOwn(obj, "main")
          && objectHasOwn(obj, "compiler")
        ) {
          // @ts-ignore
          this.source.currentLocation.start.line = (this["{{whiskersBodyBegin}}"] ?? 3) - 1
          return super.objectLiteral({
            ...obj,
            main: offsetSourceNode(obj.main as InternalSourceNode, this["{{whiskersBodyBegin}}"] ?? 3, 0),
            "{{whiskersFrontmatter}}": this["{{whiskersFrontmatter}}"]
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
