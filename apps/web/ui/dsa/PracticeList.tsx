import type { DsaPractice } from "@tintelix/schema";
import { LEETCODE, leetcodeUrl } from "@tintelix/content";
import { Icon } from "../Icon";

/** The lesson's LeetCode problems, each with a tick the learner sets when they've solved it. */
export function PracticeList({ practice, done, onToggle }: { practice: DsaPractice[]; done: string[]; onToggle: (slug: string) => void }) {
  return (
    <section className="dsa-practice" aria-labelledby="dsa-practice-h">
      <h3 id="dsa-practice-h">
        <Icon name="practice" />
        Practice on LeetCode
      </h3>
      <ul>
        {practice.map((p) => {
          const title = LEETCODE.find((x) => x.slug === p.slug)?.title ?? p.slug;
          const id = `lc-${p.slug}`;
          return (
            <li key={p.slug}>
              <input id={id} type="checkbox" checked={done.includes(p.slug)} onChange={() => onToggle(p.slug)} />
              <label htmlFor={id} className="sr-only">
                Solved {title}
              </label>
              <a href={leetcodeUrl(p.slug)} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
              {p.core && <span className="core" title="One of the Tintelix 50">★</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
