import { getFormat, colord, Colord } from 'colord'
import { roundTo } from './misc.js'

function tryColord(string) {
  if (getFormat(string)) return colord(string)
  const withHash = "#" + string
  if (getFormat(withHash)) return colord(withHash)
  throw new Error(`Invalid color ${string}`)
}

function colordHelper(fn) {
  return function colordHelperWrapper(arg, ...rest) {
    const res = fn(
      tryColord(arg),
      ...rest
    )
    return res instanceof Colord ? res.toHex().substring(1) : res
  }
}

export default {
  saturate: colordHelper((c, a) => c.saturate(a)),
  desaturate: colordHelper((c, a) => c.desaturate(a)),
  lighten: colordHelper((c, a) => c.lighten(a)),
  darken: colordHelper((c, a) => c.darken(a)),
  opacity: colordHelper((c, a) => c.alpha(a)),

  rgb: colordHelper(c => c.alpha(1).toRgbString()),
  rgba: colordHelper(c => {
    const { r, g, b, a } = c.rgba
    return `rgb(${r}, ${g}, ${b}, ${roundTo(a, 2)})`
  }),
  hsl: colordHelper(c => c.alpha(1).toHslString()),
  hsla: colordHelper(c => {
    const { h, s, l, a } = c.toHsl()
    return `hsla(${h}, ${s}%, ${l}%, ${roundTo(a, 2)})`
  }),

  red_i: colordHelper(c => c.rgba.r),
  green_i: colordHelper(c => c.rgba.g),
  blue_i: colordHelper(c => c.rgba.b),
  alpha_i: colordHelper(c => Math.round(c.rgba.a * 256)),

  red_f: colordHelper(c => c.rgba.r),
  green_f: colordHelper(c => c.rgba.g),
  blue_f: colordHelper(c => c.rgba.b),
  alpha_f: colordHelper(c => roundTo(c.rgba.a, 2))
}
