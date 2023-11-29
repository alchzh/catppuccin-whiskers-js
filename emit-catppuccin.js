#!/usr/bin/env node

import * as Catppuccin from "./dist/lib/catppuccin.js"
import { open, unlink } from "node:fs/promises"

open("./dist/lib/catppuccin.js", "w").then(async outFile => {
  for (const [name, data] of Object.entries(Catppuccin)) {
    await outFile.write(`export const ${name} = ${JSON.stringify(data, null, 2)};\n\n`)
  }
  await outFile.close()
})

unlink("./dist/lib/catppuccin.js.map")

