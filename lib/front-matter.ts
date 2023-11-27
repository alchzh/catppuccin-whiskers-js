/**
 * Work around the broken type declarations supplied by 'front-matter'
 */
import _fm from 'front-matter'

// @ts-expect-error
let fm: typeof _fm.default = _fm
// @ts-ignore
if (fm == null) { fm = require('front-matter') }

export default fm
