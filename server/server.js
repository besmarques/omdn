import process from 'node:process';

import createApp from '#server/expressApp';
import createPool from '#server/dbConnect/createPool';

const port = Number(process.env.PORT ?? 3000);
const db = createPool();
const app = createApp(db);

app.listen(port, () => {
	console.log(`OMDN running on port ${port}`);
});
