import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMediaQuery, usePageVisibility } from './usePresentationState'

export interface SceneMotion {
  selector: string
  frames: Keyframe[]
}

export function useSceneMotion(motions: SceneMotion[], compact: boolean, duration: number, rest: number) {
  const root = useRef<HTMLElement>(null)
  const animations = useRef<Animation[]>([])
  const position = useRef<number | null>(null)
  const started = useRef(false)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [paused, setPaused] = useState(false)
  const [optedIn, setOptedIn] = useState(false)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const pageVisible = usePageVisibility()
  const running = visible && pageVisible && ready && !failed && !paused && (!reduced || optedIn)

  useEffect(() => {
    const element = root.current
    if (!element) return
    if (!('IntersectionObserver' in window)) {
      setNear(true)
      setVisible(true)
      return
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); preload.disconnect() }
    }, { rootMargin: '300px' })
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= 0.2), { threshold: [0, 0.2] })
    preload.observe(element)
    visibility.observe(element)
    return () => { preload.disconnect(); visibility.disconnect() }
  }, [])

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const group: Animation[] = []
    for (const motion of motions) {
      const targets = element.querySelectorAll(motion.selector)
      if (!targets.length) throw new Error(`The product scene is missing ${motion.selector}.`)
      for (const target of targets) {
        const animation = target.animate(motion.frames, {
          duration, iterations: Infinity, fill: 'both', easing: 'linear',
        })
        animation.pause()
        animation.currentTime = position.current ?? rest
        group.push(animation)
      }
    }
    animations.current = group
    return () => {
      const time = group[0]?.currentTime
      if (typeof time === 'number') position.current = time
      group.forEach((animation) => animation.cancel())
      animations.current = []
    }
  }, [motions, duration, rest])

  useEffect(() => {
    if (!near || !root.current) return
    let cancelled = false
    setReady(false)
    setFailed(false)
    const images = [...root.current.querySelectorAll('img')]
    void Promise.all(images.map((image) => image.decode())).then(() => {
      if (!cancelled) setReady(true)
    }, () => {
      if (!cancelled) setFailed(true)
    })
    return () => { cancelled = true }
  }, [near, compact, attempt])

  useEffect(() => {
    for (const animation of animations.current) {
      if (running) {
        if (!started.current) animation.currentTime = 0
        animation.play()
      } else animation.pause()
    }
    if (running) started.current = true
  }, [running, motions])

  function replay() {
    if (failed) setAttempt((current) => current + 1)
    animations.current.forEach((animation) => { animation.currentTime = 0 })
    position.current = 0
    started.current = true
    setPaused(false)
    setOptedIn(true)
  }

  return {
    root, near, ready, failed, attempt, running, reduced,
    toggle: () => { if (running) setPaused(true); else { setPaused(false); setOptedIn(true) } },
    replay,
  }
}
