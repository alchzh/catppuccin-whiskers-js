import { objectFromEntries, objectKeys } from '../ts-extras.js'

import catppuccinHelpers from './catppuccin.js'
import miscHelpers from './misc.js'
import colorHelpers from './colors.js'
import { unquoteHelper } from './unquote.js'

export const WhiskersHelpers = {
  ...catppuccinHelpers,
  ...miscHelpers,
  ...colorHelpers,
  ...unquoteHelper
}

export type WhiskerHelperName = keyof typeof WhiskersHelpers

export const WhiskersKnownHelpers: Record<WhiskerHelperName, boolean> = objectFromEntries(
  objectKeys(WhiskersHelpers).map(name => ([name, true]))
)
