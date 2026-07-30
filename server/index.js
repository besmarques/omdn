import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get('/api', (req, res) => {
	res.json({
		status: true,
		message: 'OMDN API is running',
	});
});

app.listen(port, () => {
	console.log(`OMDN API running at http://localhost:${port}`);
});