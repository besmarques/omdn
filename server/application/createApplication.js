import createPool from '#server/dbConnect/createPool';
import createApp from '#server/expressApp';
import createApplicationServices from '#server/application/createApplicationServices';
import createWorkerLifecycle from '#server/application/createWorkerLifecycle';

export default function createApplication(
	config,
	{
		createDatabase = createPool,
		createExpressApplication = createApp,
		createServices = createApplicationServices,
		createWorkers = createWorkerLifecycle,
	} = {},
) {
	const db = createDatabase(config.database);
	const services = createServices(db, config);
	const app = createExpressApplication(db, config, services);
	const workerLifecycle = createWorkers(services.workers);

	return Object.freeze({ app, db, services, workerLifecycle });
}
