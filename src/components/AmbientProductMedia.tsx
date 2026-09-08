import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ProductMediaProps } from './ProductMedia'
import { mediaUrl } from './mediaSource'
import { useMediaQuery, usePageVisibility } from './usePresentationState'
import { useVideoPlayback } from './useVideoPlayback'

interface AnimationAsset {
  width: number
  height: number
  duration: number
  revision: string
  avif?: Omit<AnimationAsset, 'avif'>
}

interface AmbientProps extends Pick<ProductMediaProps, 'name' | 'label' | 'caption' | 'width' | 'height' | 'mobile' | 'revision' | 'onProgress' | 'className'> {
  animation: AnimationAsset & { mobile: AnimationAsset }
}

function AnimatedFallback({ source, asset, active, label, mime, onUnavailable, onProgress }: {
  source: string
  asset: AnimationAsset
  active: boolean
  label: string
  mime: 'image/avif' | 'image/webp'
  onUnavailable?: () => void
  onProgress?: ProductMediaProps['onProgress']
}) {
  const [resource, setResource] = useState<{ source: string; blob: Blob } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const started = useRef(0)
  const blob = resource?.source === source ? resource.blob : null

  useEffect(() => {
    const controller = new AbortController()
    setFailed(null)
    void fetch(source, { signal: controller.signal, credentials: 'omit' }).then(async (response) => {
      if (!response.ok || !response.headers.get('content-type')?.includes(mime)) throw new Error('The ambient animation is unavailable.')
      return response.blob()
    }).then((blob) => {
      if (!controller.signal.aborted) setResource({ source, blob })
    }, () => {
      if (!controller.signal.aborted) setFailed(source)
    })
    return () => controller.abort()
  }, [source, mime])

  useEffect(() => {
    if (failed === source) onUnavailable?.()
  }, [failed, source, onUnavailable])

  useEffect(() => {
    if (!blob || !active) { setObjectUrl(null); return }
    // A fresh object URL restarts the cached animation and its chapter clock
    // together, without another download after tab visibility or pause changes.
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob, active])

  const ready = active && Boolean(blob) && Boolean(objectUrl) && loadedUrl === objectUrl && failed !== source
  useEffect(() => {
    if (!ready || !onProgress) return
    const update = () => onProgress?.(((performance.now() - started.current) / 1000) % asset.duration, asset.duration)
    update()
    const timer = window.setInterval(update, 200)
    return () => window.clearInterval(timer)
  }, [ready, asset.duration, onProgress])

  return <>
    {active && objectUrl && blob && failed !== source && <img
      key={objectUrl}
      className={`ambient-animation ${ready ? 'is-ready' : ''}`}
      src={objectUrl}
      width={asset.width}
      height={asset.height}
      alt={label}
      data-source={source}
      decoding="async"
      onLoad={() => { started.current = performance.now(); setLoadedUrl(objectUrl) }}
      onError={() => setFailed(source)}
    />}
    {failed === source && !onUnavailable && <span className="ambient-unavailable" role="status">The product preview could not load. Please reload the page.</span>}
  </>
}

export default function AmbientProductMedia(props: AmbientProps) {
  const compact = useMediaQuery('(max-width: 640px)')
  const pageVisible = usePageVisibility()
  const [paused, setPaused] = useState(false)
  const [fallbackFor, setFallbackFor] = useState<string | null>(null)
  const [unsupportedAvif, setUnsupportedAvif] = useState<string | null>(null)
  const name = compact && props.mobile ? `${props.name}-mobile` : props.name
  const dimensions = compact && props.mobile ? props.mobile : props
  const animation = compact && props.mobile ? props.animation.mobile : props.animation
  const avifSource = animation.avif ? mediaUrl(`${name}-ambient.avif`, animation.avif.revision) : null
  const useAvif = Boolean(avifSource && unsupportedAvif !== avifSource)
  const imageAsset = useAvif && animation.avif ? animation.avif : animation
  const source = mediaUrl(`${name}.mp4`, props.revision)
  const poster = mediaUrl(`${name}.webp`, props.revision)
  const fallback = fallbackFor === source
  const active = pageVisible && !paused
  const playback = useVideoPlayback({
    source: fallback ? undefined : source,
    load: !fallback,
    active: pageVisible && !fallback,
    pausedByUser: paused,
    onPausedByUser: setPaused,
  })

  useEffect(() => {
    if (!playback.issue || fallback) return
    const video = playback.player.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    setFallbackFor(source)
  }, [playback.issue, playback.player, fallback, source])

  return <figure className={`product-media ambient-media ${props.className ?? ''}`} data-renderer={fallback ? 'animated-image' : 'video'} data-paused={paused}>
    <div className="media-frame" style={{ '--media-ratio': `${dimensions.width} / ${dimensions.height}` } as CSSProperties}>
      <img className={`media-poster ${!fallback && playback.hasFrame ? 'behind-video' : ''}`}
        src={poster} width={dimensions.width} height={dimensions.height} alt={props.label} loading="eager" fetchPriority="high" decoding="async" />
      {!fallback && <video ref={playback.player}
        width={dimensions.width} height={dimensions.height} autoPlay={active} muted loop playsInline preload="auto"
        disablePictureInPicture aria-label={props.label}
        onTimeUpdate={(event) => props.onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)} />}
      {fallback && <AnimatedFallback source={useAvif && avifSource ? avifSource : mediaUrl(`${name}-ambient.webp`, animation.revision)} asset={imageAsset}
        active={active} label={props.label} mime={useAvif ? 'image/avif' : 'image/webp'} onProgress={props.onProgress}
        onUnavailable={useAvif ? () => setUnsupportedAvif(avifSource) : undefined} />}
    </div>
    <figcaption className="sr-only">{props.caption}</figcaption>
    <button className="ambient-motion-access" type="button" onClick={() => setPaused((current) => !current)}>
      {paused ? 'Resume background motion' : 'Pause background motion'}
    </button>
  </figure>
}
