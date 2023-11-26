import Handlebars from "handlebars"

export function btoa_poly(bin) {
  try {
    return btoa(bin)
  } catch (err) {
    return Buffer.from(bin).toString('base64');
  }
}

export function atob_poly(str) {
  try {
    return atob(str)
  } catch (err) {
    return Buffer.from(str, 'base64').toString('binary');
  }
}

export const unquoteHelper = {
  unquote(value) {
    return new Handlebars.SafeString(`{WHISKERS:UNQUOTE:${btoa_poly(Handlebars.Utils.escapeExpression(value))}}`)
  }
}

export function decodeUnquote(string) {
  const allDecoded = string.replaceAll(/('|")\{WHISKERS:UNQUOTE:([a-zA-Z0-9+/]+={0,2})\}\1/g, (_, __, b64) => {
    try {
      return atob_poly(b64)
    } catch (err) {
      console.warn(err, "warning: failed to decode whiskers unquote section. this is probably a bug")
      return "{WHISKERS:UNQUOTE_ERROR}"
    }
  })
  if (/\{WHISKERS:UNQUOTE:[a-zA-Z0-9+/]+={0,2}\}/g.test(allDecoded)) {
    console.warn("warning: whiskers unquote helper used without being immediately surrounded by single or double quotes. Look for {WHISKERS:UNQUOTE:[b64 data]} in the output.")
  }
  return allDecoded
}

export default unquoteHelper
