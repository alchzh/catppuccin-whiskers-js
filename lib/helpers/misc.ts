import { default as betterTitleCase } from 'better-title-case'

export function truncate(num: number, places: number) {
  return Math.trunc(num * Math.pow(10, places)) / Math.pow(10, places)
}

// https://stackoverflow.com/a/18358056
export function roundTo(num: number, places: number) {
  return (+(Math.round(+(num + "e+" + places)) + "e-" + places)).toFixed(places);
}

export default {
  trunc: truncate,
  round: roundTo,
  uppercase(str: string) {
    return str.toUpperCase()
  },
  lowercase(str: string) {
    return str.toLowerCase()
  },
  titlecase(str: string) {
    return betterTitleCase(str)
  },
  get(obj: object, ...args: any[]) {
    if (!args.length) {
      return undefined
    }
    const { lookupProperty } = args.pop()
    return args.reduce((o, k) => o == null ? o : lookupProperty(o, k), obj)
  }
}
