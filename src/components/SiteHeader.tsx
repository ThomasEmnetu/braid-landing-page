import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Brand from './Brand'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', escape)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', escape)
      document.removeEventListener('pointerdown', outside)
    }
  }, [open])

  return (
    <header className="site-header" ref={header}>
      <div className="container header-inner">
        <Brand />
        <button className="icon-button menu-button" ref={toggle} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`navigation ${open ? 'is-open' : ''}`} id="main-navigation" aria-label="Main navigation">
          <a href="#product" onClick={() => setOpen(false)}>The product</a>
          <a href="#approach" onClick={() => setOpen(false)}>Our approach</a>
        </nav>
        <a className="button button-small button-outline header-cta" href="#waitlist" onClick={() => setOpen(false)}>
          <span className="desktop-label">Get early access</span><span className="mobile-label">Join waitlist</span><ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  )
}
