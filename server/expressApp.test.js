import { describe, expect, it, vi } from 'vitest';

import createApp from '#server/expressApp';

function createRateLimitStore() {
	return {
		localKeys: false,
		init: vi.fn(),
		increment: vi.fn(),
		decrement: vi.fn(),
		resetKey: vi.fn(),
	};
}

describe('Express application construction', () => {
	it('constructs the HTTP application without opening a listener', () => {
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			session: {
				middleware: (_req, _res, next) => next(),
				store: {},
			},
			workers: [],
		};
		const app = createApp(
			{},
			{
				appEnvironment: 'test',
				totpEncryptionKey: Buffer.alloc(32),
			},
			services,
		);

		expect(app.locals.applicationServices).toBe(services);
		expect(app.listening).toBeUndefined();
		expect(app.listen).toBeTypeOf('function');
	});
});
