import { Link, useParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { MediaGallery } from '../components/MediaGallery';
import { SubjectTag } from '../components/SubjectTag';
import { LoadError, Loading, NotFoundView } from '../components/StatusView';
import { useData } from '../data/dataContext';
import { safeUrl } from '../lib/links';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export function ResourcePage() {
  const { fellowId, resourceId } = useParams();
  const state = useData();
  const all =
    state.status === 'ready'
      ? state.data.dataset.resources.filter((r) => r.fellowId === fellowId)
      : [];
  const index = all.findIndex((r) => r.id === resourceId);
  const resource = all[index];
  useDocumentTitle(resource?.title);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError message={state.message} />;
  if (!resource) return <NotFoundView what="resource" />;

  const prev = all[(index - 1 + all.length) % all.length];
  const next = all[(index + 1) % all.length];
  const driveLink = safeUrl(resource.driveLink);
  const facts: [string, string][] = [
    ['Grade', resource.grade],
    ['Subject', resource.subject],
    ['Length', resource.length],
  ];

  return (
    <article className="detail">
      <Link className="back" to={`/${resource.fellowId}`}>
        ← All resources
      </Link>

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

      <Cover url={resource.coverUrl} className="cover cover--detail" width={1400} />

      <dl className="facts">
        {facts.map(([label, value]) => (
          <div className="fact" key={label}>
            <dt>{label}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="detail__body">
        <section className="panel detail__desc">
          <h2 className="panel__title">Description</h2>
          <p>{resource.description || resource.summary}</p>
        </section>
        <div className="detail__media">
          <MediaGallery items={resource.media} />
        </div>

        <aside className="detail__side">
          <section className="panel panel--sticky">
            <h2 className="panel__title">Use this resource</h2>
            {driveLink ? (
              <a
                className="button button--block"
                href={driveLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Drive
              </a>
            ) : (
              <span className="button button--block button--disabled" aria-disabled="true">
                Drive link coming
              </span>
            )}
            {resource.files.length > 0 && (
              <>
                <h3 className="panel__sub">What's inside ({resource.files.length})</h3>
                <ul className="files">
                  {resource.files.map((f) => {
                    const href = safeUrl(f.link);
                    return (
                      <li key={f.name}>
                        <span className="files__name">{f.name}</span>
                        {href ? (
                          <a
                            className="files__link"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open ↗
                          </a>
                        ) : (
                          <span className="files__link files__link--pending">Link coming</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <p className="panel__note">
              Free to use and adapt in your classroom. If you change it, share your version back.
            </p>
          </section>
        </aside>
      </div>

      {all.length > 1 && prev && next && (
        <nav className="pager" aria-label="More resources">
          <Link to={`/${prev.fellowId}/r/${prev.id}`}>
            ← Previous
            <b>{prev.title}</b>
          </Link>
          <Link to={`/${next.fellowId}/r/${next.id}`} className="pager__next">
            Next →<b>{next.title}</b>
          </Link>
        </nav>
      )}
    </article>
  );
}
