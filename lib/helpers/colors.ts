import { getFormat, colord, Colord } from 'colord'
import { roundTo } from './misc.js'
import { type HelperDelegate } from 'handlebars'

function tryColord(val: any) {
  if (getFormat(val)) return colord(val)
  const withHash = "#" + val
  if (getFormat(withHash)) return colord(withHash)
  throw new Error(`Invalid color ${val}`)
}

export interface colordHelperDelegate {
  (color: Colord, ...rest: any[]): any;
}

function colordHelper(fn: colordHelperDelegate): HelperDelegate {
  return function colordHelperWrapper(arg: any, ...rest: any[]) {
    const res = fn(tryColord(arg), ...rest)
    return res instanceof Colord ? res.toHex().substring(1) : res
  }
}

export interface colordAmountHelperDelegate extends colordHelperDelegate {
  (color: Colord, amount: number, ...rest: any[]): any;
}

function colordAmountHelper(fn: colordAmountHelperDelegate): HelperDelegate {
  return colordHelper(function colordAmountHelperWrapper(colorArg: any, amountArg: string | number, ...rest: any[]) {
    const amount: number = parseFloat(String(amountArg))
    if (isNaN(amount)) {
      throw new TypeError(`Amount argument ${amountArg} could not be converted to a number`)
    }
    return fn(colorArg, amountArg, ...rest)
  })
}

export default {
  saturate: colordAmountHelper((c, a: number) => c.saturate(a)),
  desaturate: colordAmountHelper((c, a: number) => c.desaturate(a)),
  lighten: colordAmountHelper((c, a: number) => c.lighten(a)),
  darken: colordAmountHelper((c, a: number) => c.darken(a)),
  opacity: colordAmountHelper((c, a: number) => c.alpha(a)),
  rotate: colordAmountHelper((c, a: number) => c.rotate(a)),

  hex: colordHelper(c => c),
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

  red_f: colordHelper(c => c.rgba.r / 256),
  green_f: colordHelper(c => c.rgba.g / 256),
  blue_f: colordHelper(c => c.rgba.b / 256),
  alpha_f: colordHelper(c => c.rgba.a),

  hue: colordHelper(c => c.toHsl().h),
  saturation: colordHelper(c => c.toHsl().s),
  lightness: colordHelper(c => c.toHsl().l),
}
