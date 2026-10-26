/**
 * "Follow me on Pinterest" box shown on every post. Pinterest is where most
 * crochet readers save patterns, so a follower there sees every new pin.
 * The link comes from /admin/settings (Pinterest URL); with no real profile set
 * (only the placeholder), the box is not shown.
 */
export function PinterestIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.4 0 .9-.6 2.2-.8 3.4-.3 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.5-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z" />
    </svg>
  );
}

/** True when the owner has entered a real profile, not the bare pinterest.com placeholder. */
export function hasPinterestProfile(url: string) {
  return /^https:\/\/(www\.)?pinterest\.[a-z.]+\/[^/?#]+/i.test(url ?? "");
}

export default function PinterestFollow({ url }: { url: string }) {
  if (!hasPinterestProfile(url)) return null;
  return (
    <aside className="pinterest-box">
      <span className="pinterest-badge">
        <PinterestIcon size={30} />
      </span>
      <div>
        <h2>Follow me on Pinterest</h2>
        <p>New patterns, color ideas and seasonal makes, pinned every week. Save your favorites for later!</p>
      </div>
      <a className="btn btn-pinterest" href={url} target="_blank" rel="noopener">
        Follow on Pinterest
      </a>
    </aside>
  );
}
