import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { ConversationExample } from "@/components/conversation-example";
import { Icon } from "@/components/ui";

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="landing">
        <section className="landing-intro">
          <h1>
            Client conversations,
            <br />
            one move ahead.
          </h1>
          <p className="lead">
            Fennlo keeps the goal and what is actually happening together, then
            determines what should happen next.
          </p>
          <Link className="button" href="/signup">
            Get started <Icon name="arrow" />
          </Link>
        </section>
        <ConversationExample />
        <section className="continuity" aria-labelledby="continuity-title">
          <h2 id="continuity-title">The conversation continues.</h2>
          <p className="muted">
            The goal stays with the client. When the situation changes, Fennlo
            determines again.
          </p>
          <Link className="text-link" href="/signup">
            Start with your first client <Icon name="arrow" />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
