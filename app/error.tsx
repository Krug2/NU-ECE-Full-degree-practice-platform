"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel"><h1>This page needs another try.</h1><p className="muted">Your saved browser data has not been cleared. Try opening the page again.</p><div className="form-actions"><button className="button" onClick={reset}>Try again</button><Link className="button secondary" href="/">Return to overview</Link></div></section>;
}
