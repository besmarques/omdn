import { redirect, useParams } from 'react-router';
import AdminTaxonomyPage from '../pages/AdminTaxonomyPage';
import { principalContext } from '#framework/contexts';

const contentTypes = Object.freeze({ article: 'Articles', recipe: 'Recipes' });
const taxonomies = new Set(['categories', 'tags']);

export function loader({ context, params }) {
	if (!Object.hasOwn(contentTypes, params.contentType) || !taxonomies.has(params.taxonomy)) throw redirect('/admin');
	if (!context.get(principalContext).permissions.includes('posts.edit_all')) throw redirect('/admin');
	return null;
}

export default function AdminTaxonomyRoute() {
	const { contentType, taxonomy } = useParams();
	return <AdminTaxonomyPage contentType={contentType} pluralLabel={contentTypes[contentType]} taxonomy={taxonomy} />;
}
