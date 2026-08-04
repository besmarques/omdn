import { describe, expect, it, vi } from 'vitest';

import createApplication from '#server/application/createApplication';

describe('application construction', () => {
	it('constructs process dependencies without starting a network listener', () => {
		const config = { database: { name: 'test' } };
		const db = {};
		const app = { listen: vi.fn() };
		const services = { workers: [{}] };
		const workerLifecycle = {};
		const createDatabase = vi.fn(() => db);
		const createServices = vi.fn(() => services);
		const createExpressApplication = vi.fn(() => app);
		const createWorkers = vi.fn(() => workerLifecycle);

		const application = createApplication(config, {
			createDatabase,
			createExpressApplication,
			createServices,
			createWorkers,
		});

		expect(createDatabase).toHaveBeenCalledWith(config.database);
		expect(createServices).toHaveBeenCalledWith(db, config);
		expect(createExpressApplication).toHaveBeenCalledWith(db, config, services);
		expect(createWorkers).toHaveBeenCalledWith(services.workers);
		expect(application).toEqual({ app, db, services, workerLifecycle });
		expect(app.listen).not.toHaveBeenCalled();
	});
});
