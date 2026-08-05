import { parseRecipeArticleSource } from '#content/recipes/recipeSchema.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const defaultPageSize = 12;
const maximumPageSize = 50;
const archivePageSize = 12;

function parseStoredJson(value, field) {
	if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
		return value;
	}

	try {
		return JSON.parse(String(value));
	} catch {
		throw new Error(`Stored recipe ${field} is invalid`);
	}
}

function normalizePublishedAt(value) {
	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		throw new Error('Stored recipe publication date is invalid');
	}

	return date.toISOString();
}

async function normalizeRecipe(row, { includeSource = false, parseSource = parseRecipeArticleSource } = {}) {
	const parsedSource = parseSource(parseStoredJson(row.source, 'source'));
	let source = parsedSource;

	if (parsedSource.descriptionHtml) {
		const { sanitizePostDescriptionHtml } = await import('#content/posts/postDescriptionSanitizer.server.js');

		source = { ...parsedSource, descriptionHtml: sanitizePostDescriptionHtml(parsedSource.descriptionHtml) };
	}
	const regionConfig = parseStoredJson(row.region_config, 'region configuration');

	return {
		contentType: row.content_type,
		id: Number(row.id),
		slug: row.canonical_slug,
		title: source.title,
		description: source.description,
		excerpt: row.excerpt,
		publishedAt: normalizePublishedAt(row.published_at),
		author: {
			id: Number(row.author_id),
			displayName: row.author_display_name,
		},
		primaryCategory: row.primary_category_id
			? {
					id: Number(row.primary_category_id),
					name: row.primary_category_name,
				}
			: null,
		presentation: {
			footer: row.footer_key,
			header: row.header_key,
			layout: row.layout_key,
			regions: regionConfig,
			template: row.template_key,
			renderVersion: Number(row.render_version),
		},
		seo: {
			description: row.seo_description,
			title: row.seo_title,
		},
		sourceSchemaVersion: Number(row.source_schema_version),
		...(includeSource ? { source } : {}),
	};
}

function validateSlug(slug) {
	if (typeof slug !== 'string' || slug.length > 200 || !slugPattern.test(slug)) {
		throw new TypeError('Invalid recipe slug');
	}

	return slug;
}

function validateListOptions({ limit = defaultPageSize, cursor = null } = {}) {
	if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximumPageSize) {
		throw new TypeError(`Recipe page size must be between 1 and ${maximumPageSize}`);
	}

	if (cursor === null) {
		return { cursor: null, limit };
	}

	const id = Number(cursor.id);
	const publishedAt = new Date(cursor.publishedAt);

	if (!Number.isSafeInteger(id) || id <= 0 || Number.isNaN(publishedAt.getTime())) {
		throw new TypeError('Invalid recipe cursor');
	}

	return { cursor: { id, publishedAt }, limit };
}

export default function createPublicRecipeService(repository, { parseSource = parseRecipeArticleSource, resultKey = 'recipe' } = {}) {
	async function getBySlug(slug) {
		const normalizedSlug = validateSlug(slug);
		const row = await repository.findBySlug(normalizedSlug);

		if (!row) {
			return null;
		}

		return {
			canonicalSlug: row.canonical_slug,
			redirect: row.requested_slug_kind === 'redirect',
			[resultKey]: await normalizeRecipe(row, { includeSource: true, parseSource }),
		};
	}

	async function list(options) {
		const { cursor, limit } = validateListOptions(options);
		const rows = await repository.list({ cursor, limit: limit + 1 });
		const hasMore = rows.length > limit;
		const visibleRows = hasMore ? rows.slice(0, limit) : rows;
		const items = await Promise.all(visibleRows.map((row) => normalizeRecipe(row, { parseSource })));
		const lastItem = items.at(-1);

		return {
			items,
			nextCursor:
				hasMore && lastItem
					? {
							id: lastItem.id,
							publishedAt: lastItem.publishedAt,
						}
					: null,
		};
	}

	async function listArchivePage(page = 1) {
		if (!Number.isSafeInteger(page) || page < 1) {
			throw new TypeError('Invalid recipe archive page');
		}

		const totalItems = await repository.count();
		const totalPages = Math.max(1, Math.ceil(totalItems / archivePageSize));

		if (page > totalPages) {
			return null;
		}

		const rows = await repository.listPage({
			limit: archivePageSize,
			offset: (page - 1) * archivePageSize,
		});

		return {
			items: await Promise.all(rows.map((row) => normalizeRecipe(row, { parseSource }))),
			page,
			pageSize: archivePageSize,
			totalItems,
			totalPages,
		};
	}

	return {
		getBySlug,
		list,
		listArchivePage,
	};
}
