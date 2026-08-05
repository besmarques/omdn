function decodeCursor(value) {
	if (value === undefined) {
		return null;
	}

	if (typeof value !== 'string' || value.length > 512) {
		throw new TypeError('Invalid recipe cursor');
	}

	try {
		const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

		if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
			throw new TypeError('Invalid recipe cursor');
		}

		return cursor;
	} catch {
		throw new TypeError('Invalid recipe cursor');
	}
}

function encodeCursor(cursor) {
	return cursor === null ? null : Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function parseLimit(value) {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) {
		throw new TypeError('Invalid recipe page size');
	}

	return Number(value);
}

function parsePage(value) {
	if (value === undefined) return 1;
	if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) {
		throw new TypeError('Invalid recipe archive page');
	}

	const page = Number(value);
	if (!Number.isSafeInteger(page)) throw new TypeError('Invalid recipe archive page');

	return page;
}

function invalidRequest(res, error) {
	return res.status(400).json({
		status: false,
		message: error.message,
	});
}

export default function createPublicRecipeController(
	publicRecipes,
	{ basePath = '/api/recipes', itemName = 'Recipe', resultKey = 'recipe' } = {},
) {
	async function list(req, res, next) {
		try {
			const result = await publicRecipes.list({
				cursor: decodeCursor(req.query.cursor),
				limit: parseLimit(req.query.limit),
			});

			return res.json({
				status: true,
				data: {
					...result,
					nextCursor: encodeCursor(result.nextCursor),
				},
			});
		} catch (error) {
			return error instanceof TypeError ? invalidRequest(res, error) : next(error);
		}
	}

	async function getBySlug(req, res, next) {
		try {
			const result = await publicRecipes.getBySlug(req.params.slug);

			if (!result) {
				return res.status(404).json({ status: false, message: `${itemName} not found` });
			}

			if (result.redirect) {
				return res.redirect(301, `${basePath}/${result.canonicalSlug}`);
			}

			return res.json({ status: true, data: result[resultKey] });
		} catch (error) {
			return error instanceof TypeError ? invalidRequest(res, error) : next(error);
		}
	}

	async function archive(req, res, next) {
		try {
			const result = await publicRecipes.listArchivePage(parsePage(req.query.page));

			if (!result) {
				return res.status(404).json({ status: false, message: `${itemName} archive page not found` });
			}

			return res.json({ status: true, data: result });
		} catch (error) {
			return error instanceof TypeError ? invalidRequest(res, error) : next(error);
		}
	}

	return { archive, getBySlug, list };
}
