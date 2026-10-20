import PrintButton from "./PrintButton";
import YarnBall from "./YarnBall";
import { getCategory, yarnVars } from "@/lib/categories";
import { renderMarkdown } from "@/lib/markdown";
import { getSiteSettings, SITE_URL } from "@/lib/site";
import type { Post } from "@/lib/types";
import { difficultyLabel, parseAbbreviations } from "@/lib/utils";

/** The printable pattern card. Not shown when `pattern` (instructions) is empty. */
export default async function PatternCard({ post }: { post: Post }) {
  const [site, category] = await Promise.all([getSiteSettings(), getCategory(post.category)]);
  const facts = [
    { label: "Skill level", value: post.difficulty ? difficultyLabel[post.difficulty] : "" },
    { label: "Yarn", value: post.yarn },
    { label: "Hook", value: post.hook },
    { label: "Gauge", value: post.gauge },
    { label: "Finished size", value: post.finished_size },
    { label: "Time", value: post.time_estimate },
  ].filter((f) => f.value);

  const abbreviations = parseAbbreviations(post.abbreviations);

  return (
    <section
      className="pattern-card"
      id="pattern-card"
      aria-labelledby="pattern-title"
      style={yarnVars(category?.color)}
    >
      <span id="pattern" />
      <div className="pattern-card-head">
        <YarnBall color="var(--c)" size={58} className="pattern-ball" />
        <div className="pattern-card-title">
          <span className="eyebrow">Free pattern · US terms</span>
          <h2 id="pattern-title">{post.title}</h2>
        </div>
        <PrintButton />
      </div>

      {facts.length > 0 && (
        <dl className="pattern-facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {post.materials.length > 0 && (
        <>
          <h3>Materials</h3>
          <ul>
            {post.materials.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}

      {abbreviations.length > 0 && (
        <>
          <h3>Abbreviations (US terms)</h3>
          <dl className="abbr-list">
            {abbreviations.map((a) => (
              <div key={a.term}>
                <dt>{a.term}</dt>
                <dd>{a.meaning}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <h3>Instructions</h3>
      <div className="pattern-steps prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.pattern) }} />

      <p className="pattern-copyright">
        © {new Date(post.published_at ?? post.created_at).getUTCFullYear()} {site.author} · {SITE_URL.replace(/^https?:\/\//, "")}
        . You may sell items you make from this pattern; please credit {site.name}. Do not copy, share or sell the
        pattern itself.
      </p>
    </section>
  );
}
