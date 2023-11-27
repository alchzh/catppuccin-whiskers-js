#! /usr/bin/env sh

npm run prepare
mv package.json package.json.tmp
jq '.name = "@alchzh/catppuccin-whiskers-js" | del(.scripts.prepare)' package.json.tmp > package.json
cp package.json dist/package.json
pnpm publish --ignore-scripts --no-git-checks
cp package.json.tmp package.json
cp package.json dist/package.json
rm package.json.tmp
