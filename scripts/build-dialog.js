import * as esbuild from 'esbuild'
import fs from 'node:fs/promises'
import packJSON from '../package.json' with { type: 'json' }

const version = packJSON.version
const now = new Date()

let results = await esbuild.build({
  entryPoints: ['src/client/auth-dialog.js'],
  bundle: true,
  banner: {
    js: `/* wiki-security-social - ${version} - ${now.toUTCString()} */`,
  },
  minify: true,
  sourcemap: true,
  logLevel: 'info',
  metafile: true,
  outfile: 'client/auth-dialog.js',
})

await fs.writeFile('meta-auth-dialog.json', JSON.stringify(results.metafile))
console.log("\n  esbuild metadata written to 'meta-auth-dialog.json'.")
