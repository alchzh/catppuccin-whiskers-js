import Handlebars from 'handlebars'
import { qualifiedNames, flavors, type FlavorName } from './lib/catppuccin.js'
import _fm from 'front-matter'

import miscHelpers from './lib/helpers/misc.js'
import colorHelpers from './lib/helpers/colors.js'
import { unquoteHelper, decodeUnquote } from './lib/helpers/unquote.js'

// Fix incorrect typing supplied by 'front-matter'
// https://github.com/jxson/front-matter/pull/77
// @ts-ignore
const fm: typeof _fm.default = _fm

interface WhiskersRuntimeOptions extends Handlebars.RuntimeOptions {
  flavor?: FlavorName
}

interface WhiskersTemplateDelegate<T = any> {
  (context: T, options?: WhiskersRuntimeOptions): string;
}

type WhiskersTemplateSpecification = ReturnType<typeof Handlebars.precompile> & {
  _whiskers_frontmatter?: object
}

function wrapTemplateFunction<T = any>(template: Handlebars.TemplateDelegate<T>, frontmatter?: {}): WhiskersTemplateDelegate<T> {
  return new Proxy(template, {
    apply(target, thisArg, argumentsList) {
      const context = argumentsList[0]
      const runtimeOptions: WhiskersRuntimeOptions | undefined = argumentsList[1]

      const flavorContext = runtimeOptions?.flavor == null ? {} : flavors[runtimeOptions.flavor]
      const whiskersContext = {
        ...qualifiedNames,
        ...flavorContext,
        ...(frontmatter ?? {}),
        ...context
      }

      if (runtimeOptions != null && Object.prototype.hasOwnProperty.call(runtimeOptions, "flavor")) {
        delete runtimeOptions["flavor"]
      }

      return decodeUnquote(Reflect.apply(target, thisArg, [whiskersContext, runtimeOptions]))
    }
  })
}

type WhiskersEnv = typeof Handlebars & {
  compile<T = any>(input: string, options?: CompileOptions): WhiskersTemplateDelegate<T>
  precompile(input: string, options?: PrecompileOptions): WhiskersTemplateSpecification
  template<T = any>(precompilation: WhiskersTemplateSpecification): WhiskersTemplateDelegate<T>
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
export function registerWhiskers(handlebarsEnv: typeof Handlebars): WhiskersEnv {
  const whiskersEnv: WhiskersEnv = Object.setPrototypeOf({
    compile<T = any>(input: string, options?: CompileOptions): WhiskersTemplateDelegate<T> {
      const { attributes, body } = fm<object>(input)
      const template = super.compile(body, options)

      return wrapTemplateFunction<T>(template, attributes)
    },

    precompile(input: string, options?: PrecompileOptions): WhiskersTemplateSpecification {
      const { attributes, body } = fm<object>(input)

      const precompilation = Object.assign(super.precompile(body, options), {
          _whiskers_frontmatter: attributes
      })

      return precompilation
    },

    template<T = any>(precompilation: WhiskersTemplateSpecification): WhiskersTemplateDelegate<T> {
      const template = super.template(precompilation)

      return wrapTemplateFunction<T>(template, precompilation._whiskers_frontmatter)
    },

    create() {
      return registerWhiskers(super.create())
    }
  }, handlebarsEnv)

  whiskersEnv.registerHelper(miscHelpers)
  whiskersEnv.registerHelper(colorHelpers)
  whiskersEnv.registerHelper(unquoteHelper)

  return whiskersEnv
}

/**
 * An isolated Handlebars environment with the Whiskers helpers and context
 * pre-registered
 */
export const Whiskers = registerWhiskers(Handlebars.create())
export default Whiskers
