import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
	globalIgnores(['dist', 'build', '.react-router', 'src/components/ui/**', 'src/hooks/use-mobile.js']),

	{
		files: ['**/*.{js,jsx}'],
		extends: [js.configs.recommended],
	},

	{
		files: ['src/**/*.{js,jsx}'],
		extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			'react-refresh/only-export-components': [
				'error',
				{
					allowConstantExport: true,
					allowExportNames: ['buttonVariants', 'links', 'meta'],
				},
			],
		},
	},

	{
		files: ['server/**/*.js', 'scripts/**/*.js', 'tests/e2e/**/*.js', '*.config.js'],
		languageOptions: {
			globals: globals.node,
		},
	},

	{
		files: ['src/routes.js'],
		languageOptions: {
			globals: globals.node,
		},
	},

	{
		files: ['**/*.test.{js,jsx}'],
		languageOptions: {
			globals: globals.vitest,
		},
	},
]);
