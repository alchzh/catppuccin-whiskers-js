#! /usr/bin/env sh

npm run prepare
mv package.json package.json.tmp
jq '.name = "@alchzh/"+.name' package.json.tmp > package.json
npm publish --ignore-scripts
cp package.json.tmp package.json
cp package.json dist/package.json
rm package.json.tmp
