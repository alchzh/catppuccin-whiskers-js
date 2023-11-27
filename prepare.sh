#!/usr/bin/env sh

tsc -p tsconfig.json
echo '{"type": "module"}' > dist/esm/package.json

tsc -p tsconfig.cjs.json
echo '{"type": "commonjs"}' > dist/cjs/package.json
