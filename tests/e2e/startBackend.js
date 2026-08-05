import { rebuildTestDatabase, seedPublishedRecipeFixture } from './database.js';

await rebuildTestDatabase();
await seedPublishedRecipeFixture();
await import('../../server/server.js');
