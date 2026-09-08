import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAmbientMedia } from './ambient-media.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const path = resolve(root, 'media-manifest.json')
const manifest = JSON.parse(await readFile(path, 'utf8'))
manifest.assets['branch-map'].ambient = await createAmbientMedia(root, resolve(root, 'public/media'), 'branch-map')
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`)
