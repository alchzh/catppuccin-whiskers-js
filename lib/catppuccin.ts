import { variants, labels } from '@catppuccin/palette'
import { objectFromEntries, objectEntries, objectKeys } from 'ts-extras'

export type LabelName = keyof typeof labels
export type FlavorName = keyof typeof variants

type FlavorContext = {
  [label in LabelName]: string;
} & {
  isLight: boolean,
  isDark: boolean
}

export type FlavorContexts = {
  [flavor in FlavorName]: FlavorContext;
}

export const flavors: FlavorContexts = objectFromEntries(
  objectEntries(variants).map(([flavor, variantLabels]) => [flavor,
    objectFromEntries(objectKeys(labels).map(label => [label, variantLabels[label].hex.substring(1)]))]
  )
)

export const qualifiedNames: Record<string, string> = objectFromEntries(
  objectEntries(variants).flatMap(([flavor, variantLabels]) =>
    objectKeys(labels).map(label => [flavor+'-'+label, variantLabels[label].hex.substring(1)])
  )
)

export function isLight(flavor: string) {
  return flavor === "latte" || (!(flavor in variants) && undefined)
}

export function isDark(flavor: string) {
  return flavor !== "latte" && (flavor in variants || undefined)
}
