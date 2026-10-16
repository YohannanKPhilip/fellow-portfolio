import type { ReactNode } from 'react';
import { colorClass, type HeroBlock, type HeroRun } from '../lib/hero';
import type { Fellow } from '../types';
import { Avatar } from './Avatar';

function Run({ run, fellow }: { run: HeroRun; fellow: Fellow }): ReactNode {
  if ('photo' in run)
    return (
      <Avatar name={fellow.firstName} photoUrl={fellow.photoUrl} blurhash={fellow.photoBlurhash} />
    );
  if ('pill' in run) {
    return (
      <span className="pill">
        <span className="pill__dot" />
        {run.pill}
      </span>
    );
  }
  // Plain text stays a bare text node; only colored text gets a wrapper.
  return run.c ? <span className={colorClass(run.c)}>{run.t}</span> : run.t;
}

function Runs({ runs, fellow }: { runs: HeroRun[]; fellow: Fellow }) {
  return (
    <>
      {runs.map((run, i) => (
        <Run key={i} run={run} fellow={fellow} />
      ))}
    </>
  );
}

type Group =
  | { kind: 'headlines'; blocks: Extract<HeroBlock, { type: 'headline' }>[] }
  | { kind: 'text'; block: Extract<HeroBlock, { type: 'text' }> };

/** Consecutive big lines share one heading; each paragraph stands alone. */
function group(blocks: HeroBlock[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (block.type === 'text') groups.push({ kind: 'text', block });
    else if (last?.kind === 'headlines') last.blocks.push(block);
    else groups.push({ kind: 'headlines', blocks: [block] });
  }
  return groups;
}

/** The top of a fellow's page, drawn from their hero document. */
export function Hero({ fellow, blocks }: { fellow: Fellow; blocks: HeroBlock[] }) {
  let firstHeading = true;
  return (
    <section className="hero">
      {group(blocks).map((g, i) => {
        if (g.kind === 'text') {
          return (
            <p className="hero__intro" key={i}>
              <Runs runs={g.block.runs} fellow={fellow} />
            </p>
          );
        }
        const lines = g.blocks.map((b, j) => (
          <span
            className={`hero__line${b.size && b.size !== 'm' ? ` hero__line--${b.size}` : ''}`}
            key={j}
          >
            <Runs runs={b.runs} fellow={fellow} />
          </span>
        ));
        // Only the first big heading is the page's h1.
        const Tag = firstHeading ? 'h1' : 'p';
        firstHeading = false;
        return (
          <Tag className="hero__title" key={i}>
            {lines}
          </Tag>
        );
      })}
    </section>
  );
}
