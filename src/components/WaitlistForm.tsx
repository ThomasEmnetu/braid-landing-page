import { ArrowRight, CircleAlert } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'

export default function WaitlistForm({ placement }: { placement: 'hero' | 'footer' }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    setEmail(value)
    if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || !input.current?.validity.valid) {
      setInvalid(true)
      setNotice('Enter a valid email address, like you@company.com.')
      input.current?.focus()
      return
    }
    setInvalid(false)
    // Storage is explicitly deferred by the founder. Never simulate a saved signup.
    setNotice('This preview is not connected to signup storage yet. Your email has not been sent or saved.')
  }

  return (
    <form className="waitlist-form" onSubmit={submit} noValidate aria-label={`${placement === 'hero' ? 'Hero' : 'Footer'} waitlist`}>
      <label className="sr-only" htmlFor={`${id}-email`}>Email address</label>
      <div className={`signup-field ${invalid ? 'has-error' : ''}`}>
        <input
          id={`${id}-email`}
          ref={input}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          required
          maxLength={254}
          value={email}
          aria-invalid={invalid}
          aria-describedby={`${id}-note ${id}-notice`}
          onChange={(event) => { setEmail(event.target.value); setInvalid(false); setNotice('') }}
        />
        <button className="button button-primary" type="submit">Join the waitlist<ArrowRight size={16} /></button>
      </div>
      <p className="signup-note" id={`${id}-note`}>
        <span className="preview-indicator" />Preview only. Email signup is not connected yet.
      </p>
      <div className="signup-notice" id={`${id}-notice`} role="status" aria-live="polite" aria-atomic="true">
        {notice && <><CircleAlert size={15} /><span>{notice}</span></>}
      </div>
    </form>
  )
}
