import { Pause, Play, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import type { PointerEvent } from 'react'
import textures from '../../scene-manifest.json'
import { useMediaQuery } from './usePresentationState'
import { useSceneMotion } from './useSceneMotion'
import type { SceneMotion } from './useSceneMotion'
import { useBranchConnections } from './useBranchConnections'

type TextureName = keyof typeof textures.assets
type MotionController = ReturnType<typeof useSceneMotion>
const EASE = 'cubic-bezier(.22,.8,.26,1)'

function Texture({ name, motion, className = '' }: { name: TextureName; motion: MotionController; className?: string }) {
  const asset = textures.assets[name]
  return <img
    className={`scene-texture ${className}`}
    src={`${import.meta.env.BASE_URL}media/scenes/${name}.webp?v=${asset.revision}${motion.attempt ? `&retry=${motion.attempt}` : ''}`}
    width={asset.width}
    height={asset.height}
    alt=""
    draggable={false}
    loading={motion.near ? 'eager' : 'lazy'}
    decoding="async"
  />
}

function SceneControls({ motion, name }: { motion: MotionController; name: string }) {
  return <figcaption className="scene-caption">
    <div className="scene-controls">
      <button type="button" className="icon-button" aria-label={`${motion.running ? 'Pause' : 'Play'} ${name} animation`} onClick={motion.toggle} disabled={motion.failed}>
        {motion.running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button type="button" className="icon-button" aria-label={`${motion.failed ? 'Retry' : 'Replay'} ${name} animation`} onClick={motion.replay}><RotateCcw size={14} /></button>
    </div>
    {motion.failed && <span className="media-status" role="status">The product artwork could not load. Use Retry to load the actual UI assets again.</span>}
  </figcaption>
}

function parallax(event: PointerEvent<HTMLElement>, disabled: boolean) {
  if (disabled || event.pointerType !== 'mouse') return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--scene-turn', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 6}deg`)
  event.currentTarget.style.setProperty('--scene-pitch', `${((event.clientY - bounds.top) / bounds.height - 0.5) * -4}deg`)
}

function resetParallax(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--scene-turn', '0deg')
  event.currentTarget.style.setProperty('--scene-pitch', '0deg')
}

const visibility = (appear: number, shown: number, fade: number, gone: number): Keyframe[] => [
  { opacity: 0, offset: 0 },
  { opacity: 0, offset: appear },
  { opacity: 1, offset: shown },
  { opacity: 1, offset: fade },
  { opacity: 0, offset: gone },
  { opacity: 0, offset: 1 },
]

function branchingMotion(compact: boolean): SceneMotion[] {
  const start = compact ? 'translate3d(10%,80%,36px)' : 'translate3d(48%,78%,36px)'
  return [
    { selector: '[data-layer="main"]', frames: [
      { transform: start, offset: 0, easing: EASE },
      { transform: start, offset: 0.1, easing: EASE },
      { transform: 'translate3d(0,0,28px)', offset: 0.25, easing: EASE },
      { transform: 'translate3d(0,-1.5%,28px)', offset: 0.66, easing: EASE },
      { transform: 'translate3d(0,0,28px)', offset: 0.83, easing: EASE },
      { transform: start, offset: 1 },
    ] },
    { selector: '[data-layer="token"]', frames: [
      { transform: 'translate3d(-10%,-18%,45px) scale(.95)', opacity: 0, offset: 0 },
      { transform: 'translate3d(-10%,-18%,45px) scale(.95)', opacity: 0, offset: 0.16, easing: EASE },
      { transform: 'translate3d(0,0,92px) scale(1)', opacity: 1, offset: 0.32, easing: EASE },
      { transform: 'translate3d(0,-1.5%,96px) scale(1)', opacity: 1, offset: 0.65, easing: EASE },
      { transform: 'translate3d(0,0,92px) scale(1)', opacity: 1, offset: 0.82, easing: EASE },
      { transform: 'translate3d(-8%,-14%,45px) scale(.95)', opacity: 0, offset: 0.96 },
      { transform: 'translate3d(-10%,-18%,45px) scale(.95)', opacity: 0, offset: 1 },
    ] },
    { selector: '[data-layer="sliding"]', frames: [
      { transform: 'translate3d(7%,-16%,-15px) scale(.96)', opacity: 0, offset: 0 },
      { transform: 'translate3d(7%,-16%,-15px) scale(.96)', opacity: 0, offset: 0.3, easing: EASE },
      { transform: 'translate3d(0,0,8px) scale(1)', opacity: 0.92, offset: 0.46, easing: EASE },
      { transform: 'translate3d(0,1.5%,8px) scale(1)', opacity: 0.92, offset: 0.76, easing: EASE },
      { transform: 'translate3d(7%,-12%,-15px) scale(.96)', opacity: 0, offset: 0.93 },
      { transform: 'translate3d(7%,-16%,-15px) scale(.96)', opacity: 0, offset: 1 },
    ] },
    { selector: '.branch-scene-orbit', frames: [
      { opacity: 0.12, transform: 'scale(.8)', offset: 0 },
      { opacity: 0.48, transform: 'scale(1)', offset: 0.45 },
      { opacity: 0.3, transform: 'scale(1.05)', offset: 0.8 },
      { opacity: 0.12, transform: 'scale(.8)', offset: 1 },
    ] },
  ]
}

export function BranchSculpture() {
  const compact = useMediaQuery('(max-width: 640px)')
  const motions = useMemo(() => branchingMotion(compact), [compact])
  const motion = useSceneMotion(motions, compact, 9500, 5700)
  useBranchConnections(motion.root, motion.running, compact)
  return <figure className="product-scene branching-scene branch-media" ref={motion.root} data-scene="branching" data-running={motion.running} data-ready={motion.ready}
    onPointerMove={(event) => parallax(event, compact || motion.reduced)} onPointerLeave={resetParallax}>
    <div className="scene-viewport branch-scene-viewport" role="img" aria-label="A dimensional view of Braid: shared main context opens into independent token-bucket and sliding-window branches.">
      <div className="scene-floor" />
      <div className="branch-scene-orbit" />
      <svg className="branch-scene-wires" aria-hidden="true">
        <path className="fork-path fork-path-token" data-wire="token" />
        <path className="fork-path fork-path-sliding" data-wire="sliding" />
      </svg>
      <div className="scene-camera branch-scene-camera">
        <div className="branch-object branch-object-main"><div className="scene-object-motion" data-layer="main"><div className="scene-card-face"><Texture name="node-main" motion={motion} /><span className="connection-point connection-point-out" data-port="main-out" /></div></div></div>
        <div className="branch-object branch-object-sliding"><div className="scene-object-motion" data-layer="sliding"><div className="scene-card-face"><Texture name="node-sliding" motion={motion} /><span className="connection-point" data-port="sliding-in" /></div></div></div>
        <div className="branch-object branch-object-token"><div className="scene-object-motion" data-layer="token"><div className="scene-card-face"><Texture name="node-token" motion={motion} /><span className="connection-point" data-port="token-in" /></div></div></div>
      </div>
    </div>
    <SceneControls motion={motion} name="branching" />
  </figure>
}

function pingMotion(compact: boolean): SceneMotion[] {
  const stops = textures.assets[compact ? 'composer-ready-mobile' : 'composer-ready'].typingStops
  const clip = (position: number) => `inset(0 ${(1 - position) * 100}% 0 0)`
  return [
    { selector: '.ping-composer-motion', frames: [
      { transform: 'translate3d(0,8%,20px) rotateX(5deg) rotateY(-5deg)', offset: 0, easing: EASE },
      { transform: 'translate3d(0,0,65px) rotateX(0deg) rotateY(0deg)', offset: 0.25, easing: EASE },
      { transform: 'translate3d(0,0,65px) rotateX(0deg) rotateY(0deg)', offset: 0.57, easing: EASE },
      { transform: 'translate3d(0,10%,8px) rotateX(6deg) rotateY(-3deg)', offset: 0.73, easing: EASE },
      { transform: 'translate3d(0,8%,20px) rotateX(5deg) rotateY(-5deg)', offset: 1 },
    ] },
    { selector: '.composer-state-at', frames: visibility(0.11, 0.14, 0.31, 0.34) },
    { selector: '.composer-state-recipient', frames: visibility(0.3, 0.32, 0.61, 0.66) },
    { selector: '.composer-state-ready', frames: visibility(0.34, 0.35, 0.61, 0.66) },
    { selector: '.typing-reveal', frames: [
      { clipPath: clip(stops[0]), offset: 0 },
      { clipPath: clip(stops[0]), offset: 0.35 },
      ...stops.map((position, index) => ({ clipPath: clip(position), offset: 0.36 + index / (stops.length - 1) * 0.2, easing: 'steps(1, end)' })),
      { clipPath: clip(stops.at(-1)!), offset: 1 },
    ] },
    { selector: '.ping-picker-motion', frames: [
      { transform: 'translate3d(-3%,25%,-30px) rotateX(-10deg) scale(.96)', opacity: 0, offset: 0 },
      { transform: 'translate3d(-3%,25%,-30px) rotateX(-10deg) scale(.96)', opacity: 0, offset: 0.13, easing: EASE },
      { transform: 'translate3d(0,0,112px) rotateX(0deg) scale(1)', opacity: 1, offset: 0.22 },
      { transform: 'translate3d(0,0,112px) rotateX(0deg) scale(1)', opacity: 1, offset: 0.3, easing: EASE },
      { transform: 'translate3d(0,-12%,70px) rotateX(5deg) scale(.97)', opacity: 0, offset: 0.37 },
      { transform: 'translate3d(-3%,25%,-30px) rotateX(-10deg) scale(.96)', opacity: 0, offset: 1 },
    ] },
    { selector: '.ping-delivery-motion', frames: [
      { transform: 'translate3d(5%,58%,-35px) rotateX(8deg) scale(.9)', opacity: 0, offset: 0 },
      { transform: 'translate3d(5%,58%,-35px) rotateX(8deg) scale(.9)', opacity: 0, offset: 0.6, easing: EASE },
      { transform: 'translate3d(0,0,132px) rotateX(0deg) rotateY(-3deg) scale(1)', opacity: 1, offset: 0.74, easing: EASE },
      { transform: 'translate3d(0,-4%,142px) rotateX(0deg) rotateY(-3deg) scale(1)', opacity: 1, offset: 0.87, easing: EASE },
      { transform: 'translate3d(0,-20%,95px) rotateX(3deg) scale(.97)', opacity: 0, offset: 0.98 },
      { transform: 'translate3d(5%,58%,-35px) rotateX(8deg) scale(.9)', opacity: 0, offset: 1 },
    ] },
  ]
}

export function PingSculpture() {
  const compact = useMediaQuery('(max-width: 640px)')
  const motions = useMemo(() => pingMotion(compact), [compact])
  const motion = useSceneMotion(motions, compact, 12000, 9600)
  const images = compact
    ? ['composer-idle-mobile', 'composer-at-mobile', 'composer-recipient-mobile', 'composer-ready-mobile', 'mention-picker-mobile', 'delivered-ping-mobile'] as const
    : ['composer-idle', 'composer-at', 'composer-recipient', 'composer-ready', 'mention-picker', 'delivered-ping'] as const
  return <figure className="product-scene ping-scene mention-media" ref={motion.root} data-scene="ping" data-running={motion.running} data-ready={motion.ready}
    onPointerMove={(event) => parallax(event, compact || motion.reduced)} onPointerLeave={resetParallax}>
    <div className="scene-viewport ping-scene-viewport" role="img" aria-label="Braid's actual composer lifts into a layered scene: type @Jordan, choose a teammate, and send a human-only ping.">
      <div className="ping-halo" />
      <div className="scene-floor" />
      <div className="scene-camera ping-scene-camera">
        <div className="ping-composer"><div className="ping-composer-motion"><div className="scene-card-face composer-face">
          <Texture name={images[0]} motion={motion} />
          <div className="composer-state composer-state-at"><Texture name={images[1]} motion={motion} /></div>
          <div className="composer-state composer-state-recipient"><Texture name={images[2]} motion={motion} /></div>
          <div className="composer-state composer-state-ready"><div className="typing-reveal"><Texture name={images[3]} motion={motion} /></div></div>
        </div></div></div>
        <div className="ping-picker"><div className="ping-picker-motion"><div className="scene-card-face picker-face"><Texture name={images[4]} motion={motion} /></div></div></div>
        <div className="ping-delivery"><div className="ping-delivery-motion"><div className="scene-card-face delivery-face"><Texture name={images[5]} motion={motion} /></div></div></div>
      </div>
    </div>
    <SceneControls motion={motion} name="teammate ping" />
  </figure>
}
