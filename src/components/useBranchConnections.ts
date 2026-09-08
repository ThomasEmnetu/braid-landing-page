import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useBranchConnections(root: RefObject<HTMLElement | null>, running: boolean, compact: boolean) {
  const active = useRef(running)
  const invalidate = useRef<(() => void) | null>(null)

  useLayoutEffect(() => {
    active.current = running
    invalidate.current?.()
  }, [running])

  useEffect(() => {
    const scene = root.current
    if (!scene) return
    const svg = scene.querySelector<SVGSVGElement>('.branch-scene-wires')
    const origin = scene.querySelector<HTMLElement>('[data-port="main-out"]')
    const token = scene.querySelector<HTMLElement>('[data-port="token-in"]')
    const sliding = scene.querySelector<HTMLElement>('[data-port="sliding-in"]')
    const tokenPath = scene.querySelector<SVGPathElement>('[data-wire="token"]')
    const slidingPath = scene.querySelector<SVGPathElement>('[data-wire="sliding"]')
    const tokenMotion = scene.querySelector<HTMLElement>('[data-layer="token"]')
    const slidingMotion = scene.querySelector<HTMLElement>('[data-layer="sliding"]')
    if (!svg || !origin || !token || !sliding || !tokenPath || !slidingPath || !tokenMotion || !slidingMotion) {
      throw new Error('The branching scene is missing a connection port.')
    }
    const connections = [
      { port: token, path: tokenPath, motion: tokenMotion },
      { port: sliding, path: slidingPath, motion: slidingMotion },
    ]
    let frame: number | undefined
    let settleUntil = 0
    let disposed = false
    const rounded = (value: number) => Math.round(value * 100) / 100

    function draw() {
      if (!svg || !origin) return
      const surface = svg.getBoundingClientRect()
      if (!surface.width || !surface.height) return
      const start = origin.getBoundingClientRect()
      const positions = connections.map(({ port, motion }) => ({
        point: port.getBoundingClientRect(),
        opacity: Number(getComputedStyle(motion).opacity),
      }))
      const viewBox = `0 0 ${surface.width} ${surface.height}`
      if (svg.getAttribute('viewBox') !== viewBox) svg.setAttribute('viewBox', viewBox)
      const x = rounded(start.x - surface.x)
      const y = rounded(start.y - surface.y)
      connections.forEach(({ path }, index) => {
        const endX = rounded(positions[index].point.x - surface.x)
        const endY = rounded(positions[index].point.y - surface.y)
        const middle = rounded((y + endY) / 2)
        const value = `M ${x} ${y} C ${x} ${middle}, ${endX} ${middle}, ${endX} ${endY}`
        if (path.getAttribute('d') !== value) path.setAttribute('d', value)
        path.style.opacity = String(positions[index].opacity * 0.72)
      })
    }

    function tick(time: number) {
      frame = undefined
      if (disposed) return
      draw()
      if (active.current || time < settleUntil) frame = requestAnimationFrame(tick)
    }

    function refresh() {
      settleUntil = performance.now() + 650
      if (frame === undefined) frame = requestAnimationFrame(tick)
    }

    // Ports are measured after perspective/parallax, not guessed in an SVG plane.
    invalidate.current = refresh
    const resize = new ResizeObserver(refresh)
    resize.observe(scene)
    scene.addEventListener('pointermove', refresh)
    scene.addEventListener('pointerleave', refresh)
    scene.addEventListener('click', refresh)
    scene.addEventListener('load', refresh, true)
    refresh()
    return () => {
      disposed = true
      if (frame !== undefined) cancelAnimationFrame(frame)
      resize.disconnect()
      scene.removeEventListener('pointermove', refresh)
      scene.removeEventListener('pointerleave', refresh)
      scene.removeEventListener('click', refresh)
      scene.removeEventListener('load', refresh, true)
      if (invalidate.current === refresh) invalidate.current = null
    }
  }, [root, compact])
}
