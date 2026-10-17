import { Link, useParams, useViewTransitionState } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Cover } from '../components/Cover';
import { MediaGallery } from '../components/MediaGallery';
import { OwnerEditButton } from '../components/OwnerEditButton';
import { ResourceCard } from '../components/ResourceCard';
import { SubjectTag } from '../components/SubjectTag';
import { LoadError, Loading, NotFoundView } from '../components/StatusView';
import { useData } from '../data/dataContext';
import { safeUrl } from '../lib/links';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useFellowTheme } from '../lib/useFellowTheme';
import { useRevealAfterLoad } from '../lib/useRevealAfterLoad';

/** How many other resources to show at the bottom of a resource page. */
const MORE_COUNT = 3;

export function ResourcePage() {
  const { fellowId, resourceId } = useParams();
  const state = useData();
  const all =
    state.status === 'ready'
      ? state.data.dataset.resources.filter((r) => r.fellowId === fellowId)
      : [];
  const index = all.findIndex((r) => r.id === resourceId);
  const resource = all[index];
  const pageFellow =
    state.status === 'ready'
      ? state.data.dataset.fellows.find((f) => f.id === fellowId)
      : undefined;
  // True while a card is growing into this page (or this page is shrinking back into its card).
  const morphing = useViewTransitionState(`/${fellowId}/r/${resourceId}`);
  const reveal = useRevealAfterLoad(state.status === 'loading');
  useDocumentTitle(resource?.title);
  useFellowTheme(pageFellow?.theme);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError message={state.message} />;
  if (!resource) return <NotFoundView what="resource" />;

  const fellow =
    state.status === 'ready'
      ? state.data.dataset.fellows.find((f) => f.id === resource.fellowId)
      : undefined;
  // Newest first: rows added to the bottom of the sheet are the most recent.
  const others = all.filter((r) => r.id !== resource.id).reverse();
  const driveLink = safeUrl(resource.driveLink);
  const facts: [string, string][] = [
    ['Grade', resource.grade],
    ['Subject', resource.subject],
    ['Length', resource.length],
  ];

  return (
    <article className={reveal ? `detail ${reveal}` : 'detail'}>
      <OwnerEditButton fellowId={resource.fellowId} resourceId={resource.id} />
      <Link viewTransition className="back" to={`/${resource.fellowId}`}>
        ← All resources
      </Link>

      <div className="detail__body">
        <header className="detail__head">
          <div className="tagrow">
            <SubjectTag subject={resource.subject} raised />
          </div>
          <h1 className="detail__title">{resource.title}</h1>
          <p className="detail__lede">{resource.summary}</p>
          {resource.tags.length > 0 && (
            <ul className="chips chips--head" aria-label="Tags">
              {resource.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </header>

        <Cover
          url={resource.coverUrl}
          className="cover cover--detail"
          width={1000}
          blurhash={resource.coverBlurhash}
          transitionName={morphing ? 'resource-cover' : undefined}
        />

        <section className="panel detail__desc">
          <h2 className="panel__title">Description</h2>
          <p className="detail__desctext">{resource.description || resource.summary}</p>
        </section>
        <div className="detail__media">
          <MediaGallery items={resource.media} />
        </div>

        <aside className="detail__side">
          <section className="panel">
            <h2 className="panel__title">Use this resource</h2>
            {driveLink ? (
              <a
                className="button button--block"
                href={driveLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open resource
              </a>
            ) : (
              <span className="button button--block button--disabled" aria-disabled="true">
                Link coming soon
              </span>
            )}
            {resource.files.length > 0 && (
              <>
                <h3 className="panel__sub">What's inside</h3>
                <ul className="inside">
                  {resource.files.map((f) => {
                    const href = safeUrl(f.link);
                    return (
                      <li key={f.name}>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {f.name} ↗
                          </a>
                        ) : (
                          f.name
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <p className="panel__note">Free to use and adapt in your classroom.</p>
          </section>
          <section className="panel">
            <h2 className="panel__title">Details</h2>
            <dl className="facts">
              {facts.map(([label, value]) => (
                <div className="fact" key={label}>
                  <dt>{label}</dt>
                  <dd>{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      {fellow && others.length > 0 && (
        <section className="more" aria-labelledby="more-title">
          <h2 className="more__title" id="more-title">
            More from{' '}
            <Avatar
              name={fellow.firstName}
              photoUrl={fellow.photoUrl}
              blurhash={fellow.photoBlurhash}
            />{' '}
            {fellow.firstName}
          </h2>
          <div className="grid">
            {others.slice(0, MORE_COUNT).map((r) => (
              <ResourceCard key={r.id} resource={r} morph={false} />
            ))}
          </div>
          <Link viewTransition className="more__all" to={`/${fellow.id}`}>
            {others.length > MORE_COUNT
              ? `See all ${others.length + 1} resources →`
              : 'See all resources →'}
          </Link>
        </section>
      )}
    </article>
  );
}
