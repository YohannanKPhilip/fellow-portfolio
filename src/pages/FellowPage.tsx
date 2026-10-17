import { useParams } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { LinksSectionView } from '../components/LinksSectionView';
import { OwnerEditButton } from '../components/OwnerEditButton';
import { ResourcesSectionView } from '../components/ResourcesSectionView';
import { LoadError, Loading, NotFoundView } from '../components/StatusView';
import { useData } from '../data/dataContext';
import { sectionResources } from '../lib/page';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useFellowTheme } from '../lib/useFellowTheme';
import { useRevealAfterLoad } from '../lib/useRevealAfterLoad';

export function FellowPage() {
  const { fellowId } = useParams();
  const state = useData();
  const reveal = useRevealAfterLoad(state.status === 'loading');
  const fellow =
    state.status === 'ready'
      ? state.data.dataset.fellows.find((f) => f.id === fellowId)
      : undefined;
  useDocumentTitle(fellow?.name);
  useFellowTheme(fellow?.theme);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError message={state.message} />;
  if (!fellow) return <NotFoundView what="fellow" />;

  const resources = state.data.dataset.resources.filter((r) => r.fellowId === fellow.id);
  let resourcesIndex = 0;

  // The page is drawn from the fellow's list of sections, in their order.
  return (
    <div className={reveal ? 'reveal' : 'page'}>
      {fellow.page.sections.map((section) => {
        if (section.type === 'hero') {
          return <Hero key={section.id} fellow={fellow} blocks={section.blocks} />;
        }
        if (section.type === 'links') {
          return <LinksSectionView key={section.id} section={section} />;
        }
        return (
          <ResourcesSectionView
            key={section.id}
            section={section}
            resources={sectionResources(section, resources)}
            index={resourcesIndex++}
          />
        );
      })}
      <OwnerEditButton fellowId={fellow.id} />
    </div>
  );
}
