import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page narrow center">
      <p className="eyebrow">404</p>
      <h1>That page isn't here</h1>
      <p className="lead">It may be a lesson that hasn't been written yet.</p>
      <Link className="btn primary" href="/">
        Back to all subjects
      </Link>
    </main>
  );
}
