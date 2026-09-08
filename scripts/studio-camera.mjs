export const FPS = 30
export const DENSITY = 3

const ease = (value) => value * value * (3 - 2 * value)
const lerp = (from, to, progress) => from + (to - from) * progress
const number = (value) => Number(value.toFixed(5))

export class Track {
  constructor(initial) {
    this.points = [{ time: 0, value: initial }]
  }

  at(time) {
    const next = this.points.findIndex((point) => point.time > time)
    if (next === -1) return this.points.at(-1).value
    if (next === 0) return this.points[0].value
    const from = this.points[next - 1]
    const to = this.points[next]
    const progress = ease((time - from.time) / (to.time - from.time))
    return Object.fromEntries(Object.keys(from.value).map((key) => [key, lerp(from.value[key], to.value[key], progress)]))
  }

  move(time, duration, value) {
    if (time < this.points.at(-1).time) throw new Error('Camera moves must not overlap.')
    this.points.push({ time, value: this.at(time) }, { time: time + duration, value })
  }

  expression(key) {
    let expression = `${number(this.points.at(-1).value[key])}`
    for (let index = this.points.length - 2; index >= 0; index--) {
      const from = this.points[index]
      const to = this.points[index + 1]
      if (from.time === to.time) continue
      const progress = `((in/${FPS}-${number(from.time)})/${number(to.time - from.time)})`
      const curve = `(${progress}*${progress}*(3-2*${progress}))`
      const value = `${number(from.value[key])}+(${number(to.value[key] - from.value[key])})*${curve}`
      expression = `if(lt(in,${number(to.time * FPS)}),${value},${expression})`
    }
    return expression
  }
}

export function frame(x, y, width, ratio) {
  return { x, y, width, height: width / ratio }
}

export function around(box, ratio, padding = 30, minimumWidth = 0) {
  if (!box) throw new Error('The actual product camera target is not visible.')
  const width = Math.max(box.width + padding * 2, (box.height + padding * 2) * ratio, minimumWidth)
  return frame(box.x + box.width / 2 - width / 2, box.y + box.height / 2 - width / ratio / 2, width, ratio)
}

export function within(box, bounds) {
  const scale = Math.min(1, bounds.width / box.width, bounds.height / box.height)
  const width = box.width * scale
  const height = box.height * scale
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - width, box.x + (box.width - width) / 2)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, box.y + (box.height - height) / 2)),
    width,
    height,
  }
}

export function cameraFilter(track, viewport, output) {
  const ratio = output.width / output.height
  const inputWidth = viewport.width * DENSITY
  const inputHeight = viewport.height * DENSITY
  const paddedWidth = Math.ceil(Math.max(inputWidth, inputHeight * ratio) / 2) * 2
  const paddedHeight = Math.ceil(Math.max(inputHeight, inputWidth / ratio) / 2) * 2
  const paddingX = (paddedWidth - inputWidth) / 2
  const paddingY = (paddedHeight - inputHeight) / 2
  const zoom = `${paddedWidth}/((${track.expression('width')})*${DENSITY})`
  const x = `(${track.expression('x')})*${DENSITY}+${paddingX}`
  const y = `(${track.expression('y')})*${DENSITY}+${paddingY}`
  return `pad=${paddedWidth}:${paddedHeight}:${paddingX}:${paddingY}:color=0x111315,zoompan=z='${zoom}':x='${x}':y='${y}':d=1:s=${output.width}x${output.height}:fps=${FPS},setsar=1`
}
