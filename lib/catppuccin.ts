import { variants as cptFlavors, labels as cptLabels } from '@catppuccin/palette'
import { objectFromEntries, objectEntries, objectKeys } from 'ts-extras'

export type LabelName = keyof typeof cptLabels
export type FlavorName = keyof typeof cptFlavors

type FlavorContext = {
  [label in LabelName]: string;
} & {
  isLight: boolean,
  isDark: boolean
}

export type FlavorContexts = {
  [flavor in FlavorName]: FlavorContext;
}

export type LabelContexts = {
  [label in LabelName]: {
    [flavor in FlavorName]: string
  };
}

export const flavors: FlavorContexts = objectFromEntries(
  objectEntries(cptFlavors).map(([flavor, variantLabels]) => [flavor,
    objectFromEntries(objectKeys(cptLabels).map(label => [label, variantLabels[label].hex.substring(1)]))]
  )
)

export const labels: LabelContexts = objectFromEntries(
  objectEntries(cptLabels).map(([label, variants]) => [label,
    objectFromEntries(objectKeys(cptFlavors).map(label => [label, variants[label].hex.substring(1)]))]
  )
)

export const accentLabels = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender"
] as const

type AccentLabel = typeof accentLabels[number]

export const accents: Pick<LabelContexts, AccentLabel> = objectFromEntries(
  accentLabels.map(a => [a, labels[a]])
)

export function isLight(flavor: string) {
  return flavor === "latte" || (!(flavor in cptFlavors) && undefined)
}

export function isDark(flavor: string) {
  return flavor !== "latte" && (flavor in cptFlavors || undefined)
}
