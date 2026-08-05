import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const apiPort = process.env.PORT ?? '3000';
const combinedDevelopmentServer = process.env.OMDN_COMBINED_DEV === 'true';

// https://vite.dev/config/
export default defineConfig({
	plugins: [reactRouter(), tailwindcss()],
	optimizeDeps: {
		// The post editors are lazy routes. Pre-bundle their browser-only editor
		// dependencies at startup so the first navigation does not invalidate the
		// active route graph while Vite discovers Tiptap.
		include: ['@tiptap/extension-link', '@tiptap/react', '@tiptap/starter-kit'],
	},
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
