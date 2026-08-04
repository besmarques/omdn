import { rebuildTestDatabase } from './database.js';

await rebuildTestDatabase();
await import('../../server/developmentServer.js');
