import { ArrowUp, Code2, GitMerge, ShieldCheck } from 'lucide-react'
import Brand from './components/Brand'
import ProductMedia from './components/ProductMedia'
import AmbientProductMedia from './components/AmbientProductMedia'
import SiteHeader from './components/SiteHeader'
import WaitlistForm from './components/WaitlistForm'
import { BranchSculpture, PingSculpture } from './components/ProductScenes'
import media from '../media-manifest.json'

function film(name: keyof typeof media.assets) {
  const asset = media.assets[name]
  return {
    name,
    video: true,
    width: asset.width,
    height: asset.height,
    mobile: { width: asset.mobile.width, height: asset.mobile.height },
    revision: `${asset.revision}-${asset.mobile.revision}`,
  }
}

function HeroExperience() {
  return <div id="product-preview" className="hero-product hero-experience">
    <div className="hero-stage">
      <AmbientProductMedia {...film('branch-map')} animation={media.assets['branch-map'].ambient} label="Branch visualizer" caption="Move from a shared conversation into the branch map, then continue in the token-bucket session." className="hero-media studio-film" />
    </div>
  </div>
}

export default function App() {
  return (
    <div id="top">
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">AI coding, <span>together.</span><br />Branch. Explore. Merge.</h1>
            <p className="hero-description">Leave isolated AI chats behind. Work in one live session, branch off to explore, and bring the result back to your team.</p>
            <div id="hero-signup"><WaitlistForm placement="hero" /></div>
          </div>
          <HeroExperience />
        </section>
        <section className="problem container" aria-labelledby="problem-title">
          <div className="problem-heading">
            <h2 id="problem-title">Shared code.<br /><span>Siloed thinking.</span></h2>
          </div>
          <p>AI work still happens in private chats. Sharing a transcript isn't the same as <strong>working in the session together.</strong></p>
        </section>

        <section className="github-connection container" id="github" aria-labelledby="github-title">
          <div className="github-intro">
            <span className="github-mark"><Code2 size={21} /></span>
            <div>
              <h2 id="github-title">Built around <strong>GitHub.</strong></h2>
            </div>
          </div>
          <p>GitHub sign-in and repo-connected sessions are part of the MVP. Reviews and merges stay in GitHub.</p>
        </section>

        <section className="product-section container" id="product" aria-labelledby="product-title">
          <h2 id="product-title" className="sr-only">Inside Braid</h2>

          <article className="feature feature-live" aria-labelledby="live-title">
            <div className="feature-copy">
              <h3 id="live-title">One agent.<br />Your whole team.</h3>
              <p>Everyone sees the same conversation, streaming replies, and code context, live.</p>
            </div>
            <ProductMedia
              {...film('live-session')}
              label="Live multiplayer session"
              caption="Send one prompt. Watch the answer arrive for everyone."
              className="live-media studio-film"
            />
          </article>

          <article className="feature feature-branch" aria-labelledby="branch-title">
            <div className="feature-copy">
              <h3 id="branch-title">An idea shouldn't<br />interrupt the team.</h3>
              <p>Fork a reply and explore independently. Your branch keeps its history while the team continues in the original session.</p>
              <div className="merge-note">
                <GitMerge size={18} />
                <p>Merging in v1 posts the branch's outcome back to its parent. Code still merges through GitHub PRs.</p>
              </div>
            </div>
            <BranchSculpture />
          </article>

          <article className="feature feature-visualizer feature-fork-flow" aria-labelledby="fork-flow-title">
            <div className="feature-copy">
              <h3 id="fork-flow-title">A new branch.<br />Not a blank chat.</h3>
              <p>Branch from an agent reply and continue in a new session with its conversation history intact.</p>
            </div>
            <ProductMedia
              {...film('branch-session')}
              label="Branch from a reply"
              caption="Choose a reply. Create a branch. Continue the conversation."
              className="detail-media fork-flow-media studio-film"
            />
          </article>

          <aside className="mention-section dimensional-mention" aria-labelledby="mention-title">
            <div className="mention-copy">
              <div><h3 id="mention-title">Talk to a teammate.</h3><p>An @mention sends a human-only ping without starting another agent reply.</p></div>
            </div>
            <PingSculpture />
          </aside>
        </section>

        <section className="approach-section" id="approach" aria-labelledby="approach-title">
          <div className="container">
            <div className="approach-intro">
              <div>
                <h2 id="approach-title">AI hasn't had its<br /><span>multiplayer moment.</span></h2>
              </div>
              <p>Docs and design became shared spaces. We believe working with AI should, too.</p>
            </div>
            <div className="values">
              <article className="value value-data">
                <ShieldCheck size={23} strokeWidth={1.4} />
                <h3>Keep the context.<br />Not the data forever.</h3>
                <p>Shared sessions need message and branch history. Our MVP commitment: retain code and conversations only as needed, with working session and account deletion.</p>
                <div className="retention-note"><p>Retention windows and model-provider terms aren't finalized yet; we'll publish them before early access.</p></div>
              </article>
              <article className="value value-workflow">
                <Code2 size={23} strokeWidth={1.4} />
                <h3>Keep your workflow.</h3>
                <p>A focused conversation and relevant code context, not another full IDE to move into.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="closing-section container" id="waitlist" aria-labelledby="waitlist-title">
          <div className="closing-mark"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={42} height={42} /><span>Early access</span></div>
          <h2 id="waitlist-title">Bring your team.<br /><span>Keep every possibility.</span></h2>
          <p className="closing-description">Get an invite when Braid is ready for your team.</p>
          <WaitlistForm placement="footer" />
        </section>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-main">
            <Brand />
            <nav aria-label="Footer navigation"><a href="#product">The product</a><a href="#approach">Our approach</a><a href="#waitlist">Early access</a></nav>
          </div>
          <div className="footer-bottom"><span>&copy; {new Date().getFullYear()} Braid</span><span>Product previews use simulated data. MVP in development.</span><a href="#top" aria-label="Back to top"><ArrowUp size={17} /></a></div>
        </div>
      </footer>
    </div>
  )
}
