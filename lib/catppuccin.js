import { variants } from "@catppuccin/palette"

const _qualifiedNames = {}
const _flavorsNoHexHash = Object.fromEntries(Object.keys(variants).map(flavor => [flavor, {}]))

for (const flavor in variants) {
  for (const label in variants[flavor]) {
    const hex = variants[flavor][label].hex.substring(1)
    _qualifiedNames[`${flavor}-${label}`] = hex
    _flavorsNoHexHash[flavor][label] = hex
  }
  _flavorsNoHexHash[flavor]["isLight"] = isLight(flavor)
  _flavorsNoHexHash[flavor]["isDark"] = isDark(flavor)
}

export const qualifiedNames = _qualifiedNames
export const flavors = _flavorsNoHexHash

export function isLight(flavor) {
  return flavor === "latte" || (!(flavor in variants) && undefined)
}

export function isDark(flavor) {
  return flavor !== "latte" && (flavor in variants || undefined)
}
