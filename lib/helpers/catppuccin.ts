import { type HelperOptions } from "handlebars"

export default {
  darklight(dark: any, light: any, options: HelperOptions) {
    return options?.data?.root?.isLight ? light : dark
  }
}
