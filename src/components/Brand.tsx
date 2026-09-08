export default function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Braid home">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="32" height="32" alt="" />
      <span>braid<span className="brand-period">.</span></span>
    </a>
  )
}
