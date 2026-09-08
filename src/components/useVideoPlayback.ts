import { useLayoutEffect, useRef, useState } from 'react'

type PlaybackIssue = 'blocked' | 'unavailable' | 'interrupted' | null

interface PlaybackState {
  playing: boolean
  hasFrame: boolean
  issue: PlaybackIssue
}

interface PlaybackOptions {
  source?: string
  load: boolean
  active: boolean
  pausedByUser: boolean
  onPausedByUser: (paused: boolean) => void
  nativeControls?: boolean
}

interface PlaybackController {
  sync: (load: boolean, active: boolean, paused: boolean) => void
  play: () => void
  pause: () => void
}

const initialState: PlaybackState = { playing: false, hasFrame: false, issue: null }
const retryDelays = [80, 240, 720, 1500]

export function playbackMessage(issue: PlaybackIssue) {
  switch (issue) {
    case 'blocked': return 'Automatic playback was blocked by your browser. Use Play to start the silent preview.'
    case 'unavailable': return 'Clip unavailable. Showing the captured screenshot. Use Retry to try again.'
    case 'interrupted': return 'Playback was interrupted. Use Play to try again.'
    default: return null
  }
}

export function useVideoPlayback({ source, load, active, pausedByUser, onPausedByUser, nativeControls = false }: PlaybackOptions) {
  const player = useRef<HTMLVideoElement>(null)
  const controller = useRef<PlaybackController | null>(null)
  const expectedPauses = useRef({ element: null as HTMLVideoElement | null, count: 0 })
  const [state, setState] = useState<PlaybackState>(initialState)

  useLayoutEffect(() => {
    const element = player.current
    if (!element || !source) {
      setState(initialState)
      return
    }
    if (expectedPauses.current.element !== element) expectedPauses.current = { element, count: 0 }
    let disposed = false
    let currentState = initialState
    let enabled = false
    let wanted = false
    let attempt = 0
    let pending = false
    let retryCount = 0
    let retryTimer: number | undefined

    const publish = (patch: Partial<PlaybackState>) => {
      if (disposed) return
      currentState = { ...currentState, ...patch }
      setState(currentState)
    }
    const clearRetry = () => {
      window.clearTimeout(retryTimer)
      retryTimer = undefined
    }
    const pauseElement = () => {
      // Pause events are queued, including across StrictMode's cleanup/setup.
      if (!element.paused) {
        expectedPauses.current.count += 1
        element.pause()
      }
    }
    const prepare = () => {
      // Safari needs the default/attribute as well as the current muted property,
      // set before attaching a source or making a play request.
      element.defaultMuted = true
      element.muted = true
      element.setAttribute('muted', '')
      element.playsInline = true
      element.setAttribute('playsinline', '')
      element.setAttribute('webkit-playsinline', '')
      element.loop = true
    }
    const attachSource = () => {
      prepare()
      element.preload = 'auto'
      if (element.getAttribute('src') !== source) element.src = source
    }
    const stop = () => {
      attempt += 1
      pending = false
      clearRetry()
      element.autoplay = false
      pauseElement()
      publish({ playing: false })
    }
    const reportIssue = (issue: Exclude<PlaybackIssue, null>) => {
      stop()
      publish({ issue, ...(issue === 'unavailable' ? { hasFrame: false } : {}) })
    }
    const reportPlaying = () => {
      if (!wanted || document.visibilityState === 'hidden' || element.paused) return
      clearRetry()
      retryCount = 0
      publish({ playing: true, hasFrame: element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA, issue: null })
    }
    const retry = () => {
      if (disposed || !wanted || retryTimer !== undefined || currentState.issue === 'blocked' || currentState.issue === 'unavailable') return
      if (retryCount >= retryDelays.length) {
        reportIssue('interrupted')
        return
      }
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined
        requestPlay()
      }, retryDelays[retryCount++])
    }
    const requestPlay = () => {
      if (disposed || !wanted || pending || document.visibilityState === 'hidden' || currentState.issue) return
      attachSource()
      element.autoplay = true
      const request = ++attempt
      pending = true
      const rejected = (error: unknown) => {
        if (disposed || request !== attempt) return
        pending = false
        if (!wanted) return
        const name = error instanceof DOMException || error instanceof Error ? error.name : ''
        if (name === 'AbortError') {
          publish({ playing: false })
          retry()
        } else {
          reportIssue(name === 'NotAllowedError' ? 'blocked' : 'unavailable')
        }
      }
      try {
        void element.play().then(() => {
          if (disposed || request !== attempt) return
          pending = false
          if (!wanted) pauseElement()
          else if (element.paused) retry()
          else reportPlaying()
        }, rejected)
      } catch (error) {
        rejected(error)
      }
    }
    const ready = () => {
      if (!wanted) return
      if (pending && element.paused) {
        attempt += 1
        pending = false
      }
      if (currentState.issue === 'interrupted') {
        retryCount = 0
        publish({ issue: null })
      }
      requestPlay()
    }
    const played = () => {
      if (!enabled || document.visibilityState === 'hidden') {
        pauseElement()
      } else if (!wanted && !element.paused) {
        if (nativeControls) {
          wanted = true
          element.autoplay = true
          onPausedByUser(false)
        } else {
          pauseElement()
        }
      }
    }
    const paused = () => {
      if (expectedPauses.current.count) {
        expectedPauses.current.count -= 1
        if (element.paused) publish({ playing: false })
        return
      }
      if (!element.paused) return
      publish({ playing: false })
      if (!wanted || element.ended || element.error || document.visibilityState === 'hidden') return
      if (nativeControls) {
        wanted = false
        stop()
        onPausedByUser(true)
      } else {
        attempt += 1
        pending = false
        retry()
      }
    }
    const ended = () => {
      if (!wanted) return
      element.currentTime = 0
      requestPlay()
    }
    const failed = () => {
      if (element.error) reportIssue('unavailable')
    }
    const waiting = () => {
      publish({ playing: false })
      if (element.paused) retry()
    }
    const listeners = {
      loadedmetadata: ready,
      loadeddata: ready,
      canplay: ready,
      play: played,
      playing: reportPlaying,
      pause: paused,
      ended,
      error: failed,
      waiting,
      stalled: waiting,
    }
    for (const [event, listener] of Object.entries(listeners)) element.addEventListener(event, listener)
    prepare()
    publish(initialState)

    const playback: PlaybackController = {
      sync(shouldLoad, isActive, isPaused) {
        const wasWanted = wanted
        enabled = isActive
        wanted = enabled && !isPaused
        if (shouldLoad) attachSource()
        if (!wanted) stop()
        else {
          if (!wasWanted && currentState.issue === 'interrupted') {
            retryCount = 0
            publish({ issue: null })
          }
          requestPlay()
        }
      },
      play() {
        wanted = enabled
        onPausedByUser(false)
        retryCount = 0
        clearRetry()
        const reload = currentState.issue === 'unavailable' || Boolean(element.error)
        stop()
        publish({ issue: null })
        attachSource()
        // Reload only for an actual failed resource, never for normal readiness
        // or visibility changes that would interrupt an in-flight play promise.
        if (reload) element.load()
        requestPlay()
      },
      pause() {
        wanted = false
        stop()
        onPausedByUser(true)
      },
    }
    controller.current = playback
    return () => {
      disposed = true
      attempt += 1
      clearRetry()
      element.autoplay = false
      pauseElement()
      for (const [event, listener] of Object.entries(listeners)) element.removeEventListener(event, listener)
      if (controller.current === playback) controller.current = null
    }
  }, [source, nativeControls, onPausedByUser])

  useLayoutEffect(() => {
    controller.current?.sync(load, active, pausedByUser)
  }, [source, load, active, pausedByUser, nativeControls, onPausedByUser])

  return {
    player,
    ...state,
    play: () => controller.current?.play(),
    pause: () => controller.current?.pause(),
  }
}
