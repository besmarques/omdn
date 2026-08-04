import { Link } from 'react-router';

import PageRenderer from '@/features/pageRendering/PageRenderer';

export default function PagePresentationExamplesPage({ page }) {
	return (
		<>
			<nav aria-label="Page presentation examples">
				<Link to="/dev/page-examples/recipe">Recipe with sidebar</Link>{' '}
				<Link to="/dev/page-examples/gift-ideas">Gift ideas, full width</Link>
			</nav>
			<PageRenderer page={page} />
		</>
	);
}
