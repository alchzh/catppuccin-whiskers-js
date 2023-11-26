import Handlebars from "handlebars"
import { qualifiedNames, flavors } from "./lib/catppuccin.js"
import fm from 'front-matter'

import miscHelpers from "./lib/helpers/misc.js"
import colorHelpers from "./lib/helpers/colors.js"
import { unquoteHelper, decodeUnquote } from "./lib/helpers/unquote.js"

function wrapTemplateFunction(template, frontmatter) {
  return new Proxy(template, {
    apply(target, thisArg, argumentsList) {
      const context = argumentsList?.[0]
      const runtimeOptions = argumentsList?.[1]

      const whiskersContext = {
        ...qualifiedNames,
        ...(flavors?.[runtimeOptions?.flavor] ?? {}),
        ...(frontmatter ?? {}),
        ...context
      }

      if (runtimeOptions != null && Object.hasOwn(runtimeOptions, "flavor")) {
        delete runtimeOptions["flavor"]
      }

      return decodeUnquote(Reflect.apply(target, thisArg, [whiskersContext, runtimeOptions]))
    }
  })
}

export function whiskersCompile(input, compileOptions) {
  const { attributes, body } = fm(input)
  const template = this.compile(body, compileOptions)

  return wrapTemplateFunction(template, attributes)
}

export function whiskersPrecompile(input, compileOptions) {
  const { attributes, body } = fm(input)
  const precompilation = this.precompile(body, compileOptions)

  precompilation._whiskers_frontmatter = attributes

  return precompilation
}

export function whiskersTemplate(precompilation) {
  const template = this.template(precompilation)

  return wrapTemplateFunction(template, precompilation._whiskers_frontmatter)
}

/**
 * Register Whiskers helpers and context to an existing Handlebars environment.
 *
 * @param handlebarsEnv - an existing Handlebars environment, either the default exported `Handlebars`, an isolated
 * environment from `Handlebars.create()`, or an environment from another package.
 *
 * @returns The existing environment `handlebarsEnv` for chaining
 */
export function registerWhiskers(handlebarsEnv) {
  handlebarsEnv.whiskersCompile = whiskersCompile
  handlebarsEnv.whiskersPrecompile = whiskersPrecompile
  handlebarsEnv.whiskersTemplate = whiskersTemplate

  handlebarsEnv._hb_create = handlebarsEnv.create
  handlebarsEnv.create = function whiskersCreateWrapper() {
    return registerWhiskers(this._hb_create())
  }

  handlebarsEnv.registerHelper(miscHelpers)
  handlebarsEnv.registerHelper(colorHelpers)
  handlebarsEnv.registerHelper(unquoteHelper)

  return handlebarsEnv
}

/**
 * An isolated Handlebars environment with the Whiskers helpers and context
 * pre-registered
 */
export const Whiskers = registerWhiskers(Handlebars.create())
export default Whiskers
