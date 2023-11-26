import { variants, type AlphaColor, type Variants } from '@catppuccin/palette'


const _qualifiedNames: {[label: string]: string} = {}

export type LabelName = keyof typeof variants;
export type FlavorName = keyof Variants<any>;

type FlavorContext = {
  [label in FlavorName]: string;
} & {
  isLight: boolean,
  isDark: boolean
}

export type FlavorContexts = {
  [flavor in FlavorName]: FlavorContext;
}

const _flavorsNoHexHash: any = Object.fromEntries(
  Object.keys(variants).map(flavor => [flavor, {}])
)

for (const [flavor, labels] of Object.entries(variants)) {
  for (const [_label, color] of Object.entries(labels)) {
    const label = _label as string
    const hex = (color as AlphaColor).hex.substring(1)

    _qualifiedNames[`${flavor}-${label}`] = hex
    _flavorsNoHexHash[flavor][label] = hex
  }
  _flavorsNoHexHash[flavor].isLight = isLight(flavor)
  _flavorsNoHexHash[flavor].isDark = isDark(flavor)
}

export const qualifiedNames = _qualifiedNames
export const flavors: FlavorContexts = _flavorsNoHexHash

export function isLight(flavor: string) {
  return flavor === "latte" || (!(flavor in variants) && undefined)
}

export function isDark(flavor: string) {
  return flavor !== "latte" && (flavor in variants || undefined)
}
