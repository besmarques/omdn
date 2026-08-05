import { describe, expect, it, vi } from 'vitest';

import createRecipeController from './createRecipeController';

function response() {
	return {
		statusCode: 200,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(body) {
			this.body = body;
			return this;
		},
	};
}

const validBody = {
	cookMinutes: 12,
	description: 'A recipe.',
	difficulty: 'easy',
	ingredients: [{ id: 'flour', name: 'flour' }],
	instructions: [{ id: 'mix', text: 'Mix.' }],
	prepMinutes: 10,
	publication: 'draft',
	slug: 'new-recipe',
	title: 'New recipe',
	yield: { quantity: 12, unit: 'servings' },
};

describe('create recipe controller', () => {
	it('validates input and enforces publish permission', async () => {
		const createRecipe = vi.fn();
		const controller = createRecipeController(createRecipe);
		const invalidResponse = response();
		const forbiddenResponse = response();

		await controller({ auth: { permissions: [], user: {} }, body: {} }, invalidResponse, vi.fn());
		await controller(
			{
				auth: { permissions: ['posts.create'], user: {} },
				body: { ...validBody, publication: 'schedule', publishAt: '2026-08-06T18:30:00.000Z' },
			},
			forbiddenResponse,
			vi.fn(),
		);

		expect(invalidResponse.statusCode).toBe(400);
		expect(forbiddenResponse.statusCode).toBe(403);
		expect(createRecipe).not.toHaveBeenCalled();
	});

	it('creates a recipe and maps slug conflicts', async () => {
		const createdRecipe = { id: 12, publication: 'publish', slug: 'new-recipe' };
		const createRecipe = vi.fn().mockResolvedValueOnce(createdRecipe).mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
		const controller = createRecipeController(createRecipe);
		const createdResponse = response();
		const conflictResponse = response();
		const request = {
			auth: {
				permissions: ['posts.create', 'posts.publish_all'],
				user: { display_name: 'Admin', id: 7 },
			},
			body: { ...validBody, publication: 'publish' },
		};

		await controller(request, createdResponse, vi.fn());
		await controller(request, conflictResponse, vi.fn());

		expect(createdResponse.statusCode).toBe(201);
		expect(createdResponse.body).toEqual({ status: true, data: createdRecipe });
		expect(createRecipe).toHaveBeenCalledWith(expect.objectContaining({ slug: 'new-recipe' }), { displayName: 'Admin', id: 7 });
		expect(conflictResponse.statusCode).toBe(409);
	});
});
