import Link from "next/link";

export default function NotFound() {
  return <main className="recovery-page"><p className="eyebrow">404</p><h1>That rail does not exist.</h1><Link href="/">Return to Downrail</Link></main>;
}
