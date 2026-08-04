import { data } from 'react-router';

import PagePresentationExamplesPage from '@/pages/dev/PagePresentationExamplesPage';
import { pagePresentationExamples } from '@/pages/dev/pagePresentationExamples';

export function loader({ params }) {
	const example = params.example ?? 'recipe';
	const page = pagePresentationExamples[example];

	if (!page) {
		throw data(null, { status: 404 });
	}

	return { page };
}

export function meta({ data: routeData }) {
	return [{ title: `${routeData?.page.content.title ?? 'Page example'} | OMDN` }];
}

export default function PagePresentationExamplesRoute({ loaderData }) {
	return <PagePresentationExamplesPage page={loaderData.page} />;
}
