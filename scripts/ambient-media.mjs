import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export function inspectAnimatedWebP(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Expected a WebP container.')
  let width = 0
  let height = 0
  let frames = 0
  let milliseconds = 0
  let loopCount = -1
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    const data = offset + 8
    if (data + size > bytes.length) throw new Error('The animated WebP is truncated.')
    if (type === 'VP8X') {
      width = bytes.readUIntLE(data + 4, 3) + 1
      height = bytes.readUIntLE(data + 7, 3) + 1
    }
    if (type === 'ANIM') loopCount = bytes.readUInt16LE(data + 4)
    if (type === 'ANMF') {
      frames += 1
      milliseconds += bytes.readUIntLE(data + 12, 3)
    }
    offset = data + size + size % 2
  }
  if (frames < 2 || loopCount !== 0 || !width || !height) throw new Error('The ambient fallback must be an infinitely looping animation.')
  return { width, height, frames, duration: milliseconds / 1000, loopCount }
}

function chunk(type, data) {
  const header = Buffer.alloc(8)
  header.write(type, 0, 4, 'ascii')
  header.writeUInt32LE(data.length, 4)
  return Buffer.concat([header, data, ...(data.length % 2 ? [Buffer.alloc(1)] : [])])
}

function imageChunks(bytes) {
  const chunks = []
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    if (offset + 8 + size > bytes.length) throw new Error('A source WebP frame is truncated.')
    if (['VP8 ', 'VP8L', 'ALPH'].includes(type)) chunks.push(bytes.subarray(offset, offset + 8 + size + size % 2))
    offset += 8 + size + size % 2
  }
  if (!chunks.length) throw new Error('A source WebP frame has no image data.')
  return Buffer.concat(chunks)
}

export function assembleIndependentFrames(frames, width, height, fps = 24) {
  const canvas = Buffer.alloc(10)
  canvas[0] = 0x02
  canvas.writeUIntLE(width - 1, 4, 3)
  canvas.writeUIntLE(height - 1, 7, 3)
  const animation = Buffer.alloc(6)
  const chunks = [chunk('VP8X', canvas), chunk('ANIM', animation)]
  frames.forEach((frame, index) => {
    const header = Buffer.alloc(16)
    header.writeUIntLE(width - 1, 6, 3)
    header.writeUIntLE(height - 1, 9, 3)
    header.writeUIntLE(Math.round((index + 1) * 1000 / fps) - Math.round(index * 1000 / fps), 12, 3)
    // Full-canvas, no-blend frames avoid lossy delta corruption during camera moves.
    header[15] = 0x02
    chunks.push(chunk('ANMF', Buffer.concat([header, imageChunks(frame)])))
  })
  const payload = Buffer.concat([Buffer.from('WEBP'), ...chunks])
  const header = Buffer.alloc(8)
  header.write('RIFF')
  header.writeUInt32LE(payload.length, 4)
  return Buffer.concat([header, payload])
}

export async function createAmbientMedia(root, output, name) {
  const scratch = resolve(root, '.capture/ambient')
  await mkdir(scratch, { recursive: true })
  const results = []
  try {
    for (const variant of [
      { suffix: '', width: 1440, height: 810 },
      { suffix: '-mobile', width: 864, height: 1080 },
    ]) {
      const base = `${name}${variant.suffix}`
      const temporary = resolve(scratch, `${base}-ambient.webp`)
      const avif = resolve(scratch, `${base}-ambient.avif`)
      const framesDirectory = resolve(scratch, `${base}-frames`)
      await mkdir(framesDirectory, { recursive: true })
      try {
        execFileSync('ffmpeg', [
          '-hide_banner', '-loglevel', 'error', '-y', '-threads', '2',
          '-i', resolve(output, `${base}.mp4`),
          '-vf', `fps=24,scale=${variant.width}:${variant.height}:flags=lanczos,format=bgra`,
          '-an', '-c:v', 'libwebp', '-quality', '88', '-compression_level', '5',
          '-f', 'image2', '-start_number', '0', resolve(framesDirectory, 'frame-%05d.webp'),
        ], { stdio: 'inherit' })
        const files = (await readdir(framesDirectory)).filter((file) => /^frame-\d+\.webp$/.test(file)).sort()
        const frames = []
        for (const file of files) frames.push(await readFile(resolve(framesDirectory, file)))
        const bytes = assembleIndependentFrames(frames, variant.width, variant.height)
        const animation = inspectAnimatedWebP(bytes)
        await writeFile(temporary, bytes)
        const result = { ...animation, independentFrames: true, revision: createHash('sha256').update(bytes).digest('hex').slice(0, 12), bytes: bytes.length }
        await rename(temporary, resolve(output, `${base}-ambient.webp`))
        execFileSync('ffmpeg', [
          '-hide_banner', '-loglevel', 'error', '-y', '-threads', '2',
          '-i', resolve(output, `${base}.mp4`),
          '-vf', `fps=24,scale=${variant.width}:${variant.height}:flags=lanczos`,
          '-an', '-c:v', 'libaom-av1', '-cpu-used', '8', '-crf', '24', '-b:v', '0',
          '-row-mt', '1', '-threads', '2', '-loop', '0', '-f', 'avif', avif,
        ], { stdio: 'inherit' })
        const avifBytes = await readFile(avif)
        result.avif = {
          width: variant.width, height: variant.height, duration: animation.duration,
          frames: animation.frames, loopCount: 0,
          revision: createHash('sha256').update(avifBytes).digest('hex').slice(0, 12),
          bytes: avifBytes.length,
        }
        await rename(avif, resolve(output, `${base}-ambient.avif`))
        results.push(result)
        console.log(`${base} ambient: ${animation.frames} frames, ${(bytes.length / 1048576).toFixed(2)} MB, infinite loop`)
        console.log(`${base} preferred AVIF: ${(avifBytes.length / 1048576).toFixed(2)} MB`)
      } finally {
        try { await unlink(temporary) } catch (error) { if (error.code !== 'ENOENT') throw error }
        try { await unlink(avif) } catch (error) { if (error.code !== 'ENOENT') throw error }
        for (const file of await readdir(framesDirectory)) {
          if (/^frame-\d+\.webp$/.test(file)) await unlink(resolve(framesDirectory, file))
        }
        await rmdir(framesDirectory)
      }
    }
  } finally {
    await rmdir(scratch)
  }
  return { ...results[0], mobile: results[1] }
}
