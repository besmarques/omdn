import { describe, expect, it, vi } from 'vitest';

import createRecipeService from './createRecipeService';

const input = {
	cookMinutes: 12,
	description: 'A simple recipe.',
	difficulty: 'easy',
	ingredients: [{ id: 'flour', name: 'flour', quantity: '200', unit: 'g' }],
	instructions: [{ id: 'mix', text: 'Mix everything.' }],
	prepMinutes: 10,
	publication: 'publish',
	slug: 'simple-recipe',
	title: 'Simple recipe',
	yield: { quantity: 12, unit: 'biscuits' },
};

describe('create recipe service', () => {
	it('builds a valid immutable recipe revision record', async () => {
		const repository = vi.fn().mockResolvedValue({ id: 10, publication: 'publish', slug: input.slug });
		const createdAt = new Date('2026-08-05T12:00:00.000Z');
		const service = createRecipeService(repository, { now: () => createdAt });
		const actor = { displayName: 'Admin', id: 7 };

		await expect(service(input, actor)).resolves.toEqual({ id: 10, publication: 'publish', slug: input.slug });
		expect(repository).toHaveBeenCalledWith(
			expect.objectContaining({
				actor,
				createdAt,
				plainText: expect.stringContaining('200 g flour'),
				publication: 'publish',
				publishAt: null,
				slug: input.slug,
				source: expect.objectContaining({ kind: 'recipe', schemaVersion: 1, title: input.title }),
				sourceHash: expect.any(Buffer),
			}),
		);
		expect(repository.mock.calls[0][0].sourceHash).toHaveLength(32);
	});

	it('passes a future scheduled publication instant to the repository', async () => {
		const repository = vi.fn().mockResolvedValue({ id: 12, publication: 'schedule' });
		const service = createRecipeService(repository, { now: () => new Date('2026-08-05T12:00:00.000Z') });

		await service({ ...input, publication: 'schedule', publishAt: '2026-08-06T18:30:00.000Z' }, { displayName: 'Admin', id: 7 });

		expect(repository).toHaveBeenCalledWith(
			expect.objectContaining({ publication: 'schedule', publishAt: new Date('2026-08-06T18:30:00.000Z') }),
		);
	});

	it('generates a normalized slug from the title when the slug is empty', async () => {
		const repository = vi.fn().mockImplementation(async (record) => ({ id: 11, slug: record.slug }));
		const service = createRecipeService(repository);

		await expect(service({ ...input, slug: '', title: 'Bolo de Maçã & Canela!' }, { displayName: 'Admin', id: 7 })).resolves.toEqual({
			id: 11,
			slug: 'bolo-de-maca-canela',
		});
		expect(repository).toHaveBeenCalledWith(expect.objectContaining({ slug: 'bolo-de-maca-canela' }));
	});
});
