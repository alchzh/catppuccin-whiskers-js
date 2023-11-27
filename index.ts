import Handlebars from 'handlebars'

import * as WhiskersLib from './lib/whiskers.js'
export * as WhiskersLib from './lib/whiskers.js'

export { WhiskersHelpers } from './lib/helpers/index.js'
export * as Catppuccin from './lib/catppuccin.js'

/**
 * An isolated Handlebars environment with the Whiskers helpers and context
 * pre-registered
 */
export const Whiskers = WhiskersLib.registerWhiskers(Handlebars.create() as WhiskersLib.HandlebarsEnv)
export default Whiskers
