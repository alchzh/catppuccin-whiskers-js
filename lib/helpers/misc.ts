import { type HelperOptions } from 'handlebars'

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
  darklight(dark: any, light: any, options: HelperOptions) {
    return options?.data?.root?.isLight ? light : dark
  }
}
