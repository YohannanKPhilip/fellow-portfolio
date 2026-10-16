import { useParams } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ResourceGrid } from '../components/ResourceGrid';
import { LoadError, Loading, NotFoundView } from '../components/StatusView';
import { config } from '../config';
import { useData } from '../data/dataContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export function FellowPage() {
  const { fellowId = config.defaultFellow } = useParams();
  const state = useData();
  const fellow =
    state.status === 'ready'
      ? state.data.dataset.fellows.find((f) => f.id === fellowId)
      : undefined;
  useDocumentTitle(fellow?.name);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError message={state.message} />;
  if (!fellow) return <NotFoundView what="fellow" />;

  const resources = state.data.dataset.resources.filter((r) => r.fellowId === fellow.id);

  return (
    <>
      <Hero fellow={fellow} />
      <section className="resources" aria-labelledby="resources-title">
        <h2 id="resources-title" className="section-title">
          Resources <span className="muted">from my classroom.</span>
        </h2>
        <p className="section-sub">
          Lesson plans, worksheets and classroom systems. Free to use and adapt.
        </p>
        <ResourceGrid resources={resources} />
      </section>
    </>
  );
}
