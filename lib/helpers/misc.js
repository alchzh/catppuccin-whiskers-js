export function truncate(num, places) {
  return Math.trunc(num * Math.pow(10, places)) / Math.pow(10, places)
}

// https://stackoverflow.com/a/18358056
export function roundTo(num, places) {
  return (+(Math.round(num + "e+" + places) + "e-" + places)).toFixed(places);
}

export default {
  trunc: truncate,
  round: roundTo,
  darklight(dark, light, options) {
    return options?.data?.root?.isLight ? light : dark
  }
}
