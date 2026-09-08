import { Expand, Pause, Play, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { playbackMessage, useVideoPlayback } from './useVideoPlayback'
import { useMediaQuery, usePageVisibility } from './usePresentationState'
import { mediaUrl } from './mediaSource'

export interface ProductMediaProps {
  name: string
  label: string
  caption: string
  width: number
  height: number
  mobile?: { width: number; height: number }
  revision?: string
  video?: boolean
  priority?: boolean
  className?: string
  onProgress?: (time: number, duration: number) => void
}

interface SelectedMedia {
  source: string
  poster: string
  width: number
  height: number
}

function MediaDialog({ media, selected, close, pageVisible, pausedByUser, onPausedByUser }: {
  media: ProductMediaProps
  selected: SelectedMedia
  close: () => void
  pageVisible: boolean
  pausedByUser: boolean
  onPausedByUser: (paused: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => {
      element?.close()
      document.body.style.overflow = overflow
    }
  }, [])
  const playback = useVideoPlayback({
    source: media.video ? selected.source : undefined,
    load: true,
    active: pageVisible,
    pausedByUser,
    onPausedByUser,
    nativeControls: true,
  })
  const message = playbackMessage(playback.issue)
  const canPause = playback.playing || (pageVisible && !pausedByUser && !playback.issue)
  return (
    <dialog className="media-dialog" ref={dialog} aria-label={`${media.label}, enlarged`} onClose={() => {
      // Strict Mode may close and reopen the same dialog before its close event runs.
      if (!dialog.current?.open) close()
    }} onClick={(event) => {
      if (event.target === event.currentTarget) dialog.current?.close()
    }}>
      <div className="media-dialog-heading">
        <span>{media.label}<small>Recorded directly from the Braid demo</small></span>
        <div className="media-dialog-actions">
          {media.video && <button className="media-control" type="button" aria-label={`${canPause ? 'Pause' : playback.issue === 'unavailable' ? 'Retry' : 'Play'} enlarged ${media.label.toLowerCase()} preview`} onClick={canPause ? playback.pause : playback.play}>
            {canPause ? <Pause size={14} /> : <Play size={14} />}
          </button>}
          <button className="icon-button" autoFocus aria-label="Close enlarged preview" onClick={() => dialog.current?.close()}><X size={22} /></button>
        </div>
      </div>
      {media.video ? (
        <video ref={playback.player} controls muted loop playsInline poster={selected.poster} width={selected.width} height={selected.height} aria-label={media.label} />
      ) : <img src={selected.poster} width={selected.width} height={selected.height} alt={media.label} />}
      <p>{media.caption}</p>
      {message && <p className="media-status" role="status">{message}</p>}
    </dialog>
  )
}

export default function ProductMedia(props: ProductMediaProps) {
  const { name, label, caption, width, height, video = false, priority = false, className = '' } = props
  const figure = useRef<HTMLElement>(null)
  const expandButton = useRef<HTMLButtonElement>(null)
  const mobileViewport = useMediaQuery('(max-width: 640px)')
  const pageVisible = usePageVisibility()
  const [near, setNear] = useState(priority)
  const [visible, setVisible] = useState(false)
  const [pausedByUser, setPausedByUser] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const dimensions = mobileViewport && props.mobile ? props.mobile : { width, height }
  const selectedName = mobileViewport && props.mobile ? `${name}-mobile` : name
  const selected = {
    source: mediaUrl(`${selectedName}.mp4`, props.revision),
    poster: mediaUrl(`${selectedName}.webp`, props.revision),
    ...dimensions,
  }
  const playback = useVideoPlayback({
    source: video ? selected.source : undefined,
    load: near,
    active: visible && pageVisible && !expanded,
    pausedByUser,
    onPausedByUser: setPausedByUser,
  })
  const message = playbackMessage(playback.issue)
  const canPause = playback.playing || (visible && pageVisible && !expanded && !pausedByUser && !playback.issue)

  useEffect(() => {
    const element = figure.current
    if (!element) return
    if (!('IntersectionObserver' in window)) {
      setNear(true)
      setVisible(true)
      return
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); preload.disconnect() }
    }, { rootMargin: '250px' })
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15), { threshold: [0, 0.15] })
    preload.observe(element)
    visibility.observe(element)
    return () => { preload.disconnect(); visibility.disconnect() }
  }, [])

  return (
    <figure className={`product-media ${className}`} ref={figure}>
      <div className="media-frame" style={{ '--media-ratio': `${dimensions.width} / ${dimensions.height}` } as CSSProperties}>
        <img
          className={`media-poster ${playback.hasFrame && playback.issue !== 'unavailable' ? 'behind-video' : ''}`}
          src={selected.poster}
          alt={label}
          width={dimensions.width}
          height={dimensions.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
        />
        {video && (
          <video
            ref={playback.player}
            width={dimensions.width}
            height={dimensions.height}
            muted
            loop
            playsInline
            preload={near ? 'auto' : 'none'}
            aria-label={label}
            onTimeUpdate={(event) => props.onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)}
          />
        )}
        <div className="media-actions">
          {video && <button className="media-control" type="button" aria-label={`${canPause ? 'Pause' : playback.issue === 'unavailable' ? 'Retry' : 'Play'} ${label.toLowerCase()} preview`} onClick={() => {
            if (canPause) playback.pause()
            else {
              setNear(true)
              playback.play()
            }
          }}>{canPause ? <Pause size={14} /> : <Play size={14} />}</button>}
          <button className="media-control" type="button" ref={expandButton} aria-label={`Enlarge ${label.toLowerCase()}`} onClick={() => setExpanded(true)}><Expand size={14} /></button>
        </div>
      </div>
      <figcaption className={message ? 'media-feedback' : 'sr-only'}>{message ? <span className="media-status" role="status">{message}</span> : caption}</figcaption>
      {expanded && <MediaDialog media={props} selected={selected} pageVisible={pageVisible} pausedByUser={pausedByUser} onPausedByUser={setPausedByUser} close={() => {
        setExpanded(false)
        expandButton.current?.focus({ preventScroll: true })
      }} />}
    </figure>
  )
}
