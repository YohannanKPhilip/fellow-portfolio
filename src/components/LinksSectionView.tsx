import { config } from '../config';
import { imageRef } from '../data/supabase/mappers';
import { colorClass } from '../lib/hero';
import { describeMedia } from '../lib/media';
import { DEFAULT_LINKS_TITLE, linkHost, type LinkItem, type LinksSection } from '../lib/page';
import { Cover } from './Cover';

/** The heading of a section: pieces of text, some in a palette color. */
export function SectionHeading({
  id,
  title,
}: {
  id: string;
  title: NonNullable<LinksSection['title']>;
}) {
  return (
    <h2 id={id} className="section-title">
      {title.map((run, i) =>
        run.c ? (
          <span key={i} className={colorClass(run.c)}>
            {run.t}
          </span>
        ) : (
          run.t
        ),
      )}
    </h2>
  );
}

/**
 * The picture on a link card: the one the fellow uploaded, otherwise the YouTube thumbnail for a
 * YouTube link. Other links have none and show as plain text cards.
 */
function linkPicture(item: LinkItem): { url: string; blurhash?: string } | undefined {
  if (item.image) return { url: imageRef(item.image, config.supabaseUrl), blurhash: item.blurhash };
  const view = describeMedia(item.url);
  return view?.kind === 'youtube' && view.thumbUrl ? { url: view.thumbUrl } : undefined;
}

/** What is inside a link card, shared by the page and the editor. `arrow` marks a link that leaves the site. */
export function LinkCardBody({ item, arrow = false }: { item: LinkItem; arrow?: boolean }) {
  const picture = linkPicture(item);
  return (
    <>
      {picture ? (
        <Cover
          url={picture.url}
          className="linkcard__pic"
          width={600}
          blurhash={picture.blurhash}
        />
      ) : (
        // No picture: a quiet tile of the same shape, so every card in a row is the same height.
        <span className="linkcard__pic linkcard__pic--none" aria-hidden="true">
          {linkHost(item.url).charAt(0).toUpperCase()}
        </span>
      )}
      <span className="linkcard__label">{item.label}</span>
      <span className="linkcard__host">
        {linkHost(item.url)}
        {arrow && ' ↗'}
      </span>
    </>
  );
}

/** A titled set of links, shown as cards. A section with no links shows nothing to visitors. */
export function LinksSectionView({ section }: { section: LinksSection }) {
  if (section.items.length === 0) return null;
  const title = section.title ?? DEFAULT_LINKS_TITLE;
  const titleId = `links-title-${section.id}`;
  return (
    <section className="resources" aria-labelledby={title.length ? titleId : undefined}>
      {title.length > 0 && <SectionHeading id={titleId} title={title} />}
      <ul className="linkgrid">
        {section.items.map((item, i) => (
          <li key={`${i}-${item.url}`}>
            <a className="linkcard" href={item.url} target="_blank" rel="noopener noreferrer">
              <LinkCardBody item={item} arrow />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
