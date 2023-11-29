import type { HelperOptions } from "handlebars"

export default {
  darklight(dark: any, light: any, options: HelperOptions) {
    if (options?.data?.root?.isLight == null) {
      if (options?.data?.root?.isDark == null) {
        throw new Error("No isLight or isDark in root context. Is Whiskers registered and did you supply a flavor?")
      }
    }
    const { isLight, isDark } = options?.data?.root
    if (isLight && isDark) {
      throw new Error("Both isLight and isDark are true")
    } else if (isLight && isDark) {
      throw new Error("Niehter isLight and isDark are true")
    }
    return isLight ? light : dark
  }
}
