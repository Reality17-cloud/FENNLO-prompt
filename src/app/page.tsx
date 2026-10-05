import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { ConversationExample } from "@/components/conversation-example";
import { Icon } from "@/components/ui";
export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="landing">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="hero-kicker">Client Next Move</p>
            <h1>
              Client conversations,
              <br />
              one move ahead.
            </h1>
            <p className="lead">
              Keep the goal and what’s happening together. Know the next move,
              and what to say.
            </p>
            <Link className="button" href="/signup">
              Get started
              <Icon name="arrow" />
            </Link>
          </div>
          <ConversationExample />
        </section>
        <section className="continuity" aria-labelledby="continuity-title">
          <h2 id="continuity-title">
            The conversation
            <br />
            continues.
          </h2>
          <div>
            <p>
              The goal stays with the client. When the situation changes, Fennlo
              determines again.
            </p>
            <Link href="/signup" className="text-link">
              Start with your first client
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
