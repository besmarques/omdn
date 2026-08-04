import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const apiPort = process.env.PORT ?? '3000';
const combinedDevelopmentServer = process.env.OMDN_COMBINED_DEV === 'true';

// https://vite.dev/config/
export default defineConfig({
	plugins: [reactRouter(), tailwindcss()],
	server: {
		...(combinedDevelopmentServer
			? {}
			: {
					proxy: {
						'/api': `http://127.0.0.1:${apiPort}`,
					},
				}),
	},
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, './src'),
		},
	},
});
