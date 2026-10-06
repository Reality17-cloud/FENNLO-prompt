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
            <h1>
              Client conversations,
              <br />
              one move ahead.
            </h1>
            <p className="lead">
              Know what should happen next before deciding what to say.
            </p>
            <Link className="button" href="/signup">
              Get started
              <Icon name="arrow" />
            </Link>
          </div>
          <ConversationExample />
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
