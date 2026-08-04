import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
	throw new Error('Logic maps are disabled in production.');
}

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const serverDirectory = path.join(rootDirectory, 'server');
const modulesDirectory = path.join(serverDirectory, 'modules');
const outputDirectory = path.join(rootDirectory, 'docs', 'diagrams', 'runtime');
const sourceDirectory = path.join(outputDirectory, 'source');
const mermaidCommand = path.join(rootDirectory, 'node_modules', '.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');

const generatedHeader = [
	'%% AUTO-GENERATED — DO NOT EDIT',
	'%% Run: npm run logic-map',
	'%% Add a new *Routes.js and *Module.js folder under server/modules and rerun.',
	'',
].join('\n');

const mermaidInit = '%%{init: {"flowchart": {"curve": "linear", "nodeSpacing": 35, "rankSpacing": 55}}}%%';

const styles = `
	classDef route fill:#3A8BC1,stroke:#216182,color:#fff;
	classDef middleware fill:#CCA300,stroke:#A28100,color:#204E4A;
	classDef controller fill:#C43A47,stroke:#843145,color:#fff;
	classDef service fill:#843145,stroke:#843145,color:#fff;
	classDef repository fill:#3E6C67,stroke:#204E4A,color:#fff;
	classDef module fill:#204E4A,stroke:#204E4A,color:#fff;
	classDef database fill:#E2DDD5,stroke:#204E4A,color:#204E4A;
`;

function findClosingParenthesis(source, openingIndex) {
	let depth = 0;
	let quote = null;
	let escaped = false;

	for (let index = openingIndex; index < source.length; index += 1) {
		const character = source[index];

		if (quote) {
			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === quote) {
				quote = null;
			}

			continue;
		}

		if (character === "'" || character === '"' || character === '`') {
			quote = character;
			continue;
		}

		if (character === '(') {
			depth += 1;
		}

		if (character === ')') {
			depth -= 1;

			if (depth === 0) {
				return index;
			}
		}
	}

	return -1;
}

function splitArguments(value) {
	const result = [];

	let current = '';
	let roundDepth = 0;
	let squareDepth = 0;
	let curlyDepth = 0;
	let quote = null;
	let escaped = false;

	for (const character of value) {
		if (quote) {
			current += character;

			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === quote) {
				quote = null;
			}

			continue;
		}

		if (character === "'" || character === '"' || character === '`') {
			quote = character;
			current += character;

			continue;
		}

		if (character === '(') {
			roundDepth += 1;
		}

		if (character === ')') {
			roundDepth -= 1;
		}

		if (character === '[') {
			squareDepth += 1;
		}

		if (character === ']') {
			squareDepth -= 1;
		}

		if (character === '{') {
			curlyDepth += 1;
		}

		if (character === '}') {
			curlyDepth -= 1;
		}

		if (character === ',' && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
			result.push(current.trim());
			current = '';

			continue;
		}

		current += character;
	}

	if (current.trim()) {
		result.push(current.trim());
	}

	return result;
}

function findCalls(source, regularExpression) {
	const calls = [];
	let match;

	regularExpression.lastIndex = 0;

	while ((match = regularExpression.exec(source))) {
		const openingIndex = regularExpression.lastIndex - 1;

		const closingIndex = findClosingParenthesis(source, openingIndex);

		if (closingIndex < 0) {
			continue;
		}

		calls.push({
			match,
			arguments: splitArguments(source.slice(openingIndex + 1, closingIndex)),
		});

		regularExpression.lastIndex = closingIndex + 1;
	}

	return calls;
}

function removeQuotes(value) {
	const text = value.trim();

	return /^(['"`]).*\1$/s.test(text) ? text.slice(1, -1) : text;
}

function normalizeFactoryName(name) {
	const value = name.replace(/^create/, '');

	return value ? value[0].toLowerCase() + value.slice(1) : name;
}

function humanize(value) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replaceAll(/[-_]+/g, ' ')
		.replace(/^./, (character) => character.toUpperCase());
}

function escapeLabel(value) {
	return value.replaceAll('"', '&quot;');
}

function safeId(value) {
	const normalized = value
		.replaceAll(/[^A-Za-z0-9_]/g, '_')
		.replaceAll(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	return normalized || 'node';
}

function joinUrl(prefix, routePath) {
	const left = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;

	const right = routePath.startsWith('/') ? routePath : `/${routePath}`;

	return `${left}${right}`;
}

function describeExpression(expression) {
	const text = expression.trim();

	if (/^[A-Za-z_$][\w$]*$/.test(text)) {
		return text;
	}

	if (text.includes('=>') || text.startsWith('function') || text.startsWith('async ')) {
		return 'inlineHandler';
	}

	const call = text.match(/^([A-Za-z_$][\w$.]*)\s*\(/);

	if (call) {
		return normalizeFactoryName(call[1]);
	}

	return text.replaceAll(/\s+/g, ' ').slice(0, 60);
}

function detectNodeType(label) {
	const value = label.toLowerCase();

	if (/^[A-Z]+ \/\S*/.test(label)) {
		return 'route';
	}

	if (value.startsWith('require') || value === 'authenticated') {
		return 'middleware';
	}

	if (value.includes('controller') || value === 'inlinehandler') {
		return 'controller';
	}

	if (value.includes('service')) {
		return 'service';
	}

	if (value.includes('repository')) {
		return 'repository';
	}

	if (value.includes('module') || label === 'Express app') {
		return 'module';
	}

	if (label === 'MariaDB') {
		return 'database';
	}

	return 'route';
}

function isArchitectureDependency(name) {
	return /(Controller|Service|Repository)$/i.test(name);
}

function readRoutes(source, prefix, groupName) {
	return findCalls(source, /\brouter\.(get|post|put|patch|delete|options|head)\s*\(/g).map(({ match, arguments: argumentsList }) => ({
		method: match[1].toUpperCase(),

		path: joinUrl(prefix, removeQuotes(argumentsList[0])),

		handlers: argumentsList.slice(1).map(describeExpression),

		groupName,
	}));
}

function readFactoryDependencies(source) {
	const dependencies = new Map();

	const assignments = findCalls(source, /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(create[A-Z][\w$]*)\s*\(/g);

	for (const assignment of assignments) {
		const variableName = assignment.match[1];

		const identifiers = assignment.arguments.join(' ').match(/\b[A-Za-z_$][\w$]*\b/g) ?? [];

		dependencies.set(variableName, [...new Set(identifiers.filter(isArchitectureDependency))]);
	}

	return dependencies;
}

function mergeDependencyMaps(target, source) {
	for (const [name, dependencies] of source) {
		target.set(name, dependencies);
	}
}

function resolveRouteFlow(finalHandler, dependencyMap) {
	const components = [];
	const visited = new Set([finalHandler]);

	let current = finalHandler;
	let repository = null;

	while (true) {
		const next = (dependencyMap.get(current) ?? []).find((candidate) => !visited.has(candidate));

		if (!next) {
			break;
		}

		visited.add(next);

		if (next.toLowerCase().includes('repository')) {
			repository = next;
			break;
		}

		components.push(next);
		current = next;
	}

	return {
		components,
		repository,
	};
}

async function findFilesRecursively(directory, predicate) {
	const entries = await fs.readdir(directory, {
		withFileTypes: true,
	});

	const files = [];

	for (const entry of entries) {
		const target = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await findFilesRecursively(target, predicate)));

			continue;
		}

		if (entry.isFile() && predicate(entry.name)) {
			files.push(target);
		}
	}

	return files;
}

function getRouteGroup(moduleDirectory, routeFile) {
	const relativeDirectory = path.relative(moduleDirectory, path.dirname(routeFile));

	if (!relativeDirectory) {
		return 'Core';
	}

	return relativeDirectory.split(path.sep)[0];
}

function readExpressMounts(source) {
	return findCalls(source, /\bapp\.use\s*\(/g)
		.filter(({ arguments: argumentsList }) => /^["'`]/.test(argumentsList[0] ?? ''))
		.map(({ arguments: argumentsList }) => ({
			prefix: removeQuotes(argumentsList[0]),

			chain: argumentsList.slice(1).map(describeExpression),
		}));
}

function findFeaturePrefix(mounts, moduleName) {
	const mount = mounts.find(({ chain }) => chain.includes(`${moduleName}Module`));

	return mount?.prefix ?? `/api/${moduleName}`;
}

function createFeatureDiagram(feature) {
	const lines = [generatedHeader, mermaidInit, 'flowchart LR'];

	const routesByGroup = new Map();

	for (const route of feature.routes) {
		if (!routesByGroup.has(route.groupName)) {
			routesByGroup.set(route.groupName, []);
		}

		routesByGroup.get(route.groupName).push(route);
	}

	const repositoryIds = new Map();
	const repositoryEdges = [];

	let groupIndex = 0;
	let routeIndex = 0;

	for (const [groupName, routes] of routesByGroup) {
		groupIndex += 1;

		const groupId = `group_${groupIndex}_${safeId(groupName)}`;

		lines.push(`\tsubgraph ${groupId}["${escapeLabel(humanize(groupName))}"]`, '\t\tdirection LR');

		for (const route of routes) {
			routeIndex += 1;

			const prefix = `r${routeIndex}`;
			const chain = [];

			const routeNodeId = `${prefix}_route`;

			lines.push(`\t\t${routeNodeId}["${escapeLabel(`${route.method} ${route.path}`)}"]:::route`);

			chain.push(routeNodeId);

			for (let index = 0; index < route.handlers.length; index += 1) {
				const handler = route.handlers[index];

				const handlerId = `${prefix}_handler_${index + 1}`;

				lines.push(`\t\t${handlerId}["${escapeLabel(handler)}"]:::${detectNodeType(handler)}`);

				chain.push(handlerId);
			}

			const finalHandler = route.handlers.at(-1);

			if (finalHandler) {
				const flow = resolveRouteFlow(finalHandler, feature.dependencies);

				for (let index = 0; index < flow.components.length; index += 1) {
					const component = flow.components[index];

					const componentId = `${prefix}_dependency_${index + 1}`;

					lines.push(`\t\t${componentId}["${escapeLabel(component)}"]:::${detectNodeType(component)}`);

					chain.push(componentId);
				}

				if (flow.repository) {
					if (!repositoryIds.has(flow.repository)) {
						repositoryIds.set(
							flow.repository,

							`repository_${safeId(flow.repository)}`,
						);
					}

					repositoryEdges.push({
						from: chain.at(-1),

						to: repositoryIds.get(flow.repository),
					});
				}
			}

			if (chain.length > 1) {
				lines.push(`\t\t${chain.join(' --> ')}`);
			}
		}

		lines.push('\tend');
	}

	if (repositoryIds.size > 0) {
		lines.push('\tsubgraph data_access["Data access"]', '\t\tdirection LR');

		for (const [repositoryName, repositoryId] of repositoryIds) {
			lines.push(`\t\t${repositoryId}["${escapeLabel(repositoryName)}"]:::repository`);
		}

		lines.push('\t\tdatabase[("MariaDB")]:::database');

		for (const repositoryId of repositoryIds.values()) {
			lines.push(`\t\t${repositoryId} --> database`);
		}

		lines.push('\tend');

		for (const edge of repositoryEdges) {
			lines.push(`\t${edge.from} --> ${edge.to}`);
		}
	}

	lines.push(styles);

	return lines.join('\n');
}

function createApplicationDiagram(mounts) {
	const lines = [generatedHeader, mermaidInit, 'flowchart LR', '\tapp["Express app"]:::module'];

	let mountIndex = 0;

	for (const mount of mounts) {
		mountIndex += 1;

		const chain = ['app'];

		const pathNodeId = `mount_${mountIndex}_path`;

		lines.push(`\t${pathNodeId}["${escapeLabel(mount.prefix)}"]:::route`);

		chain.push(pathNodeId);

		for (let index = 0; index < mount.chain.length; index += 1) {
			const item = mount.chain[index];

			const itemId = `mount_${mountIndex}_item_${index + 1}`;

			lines.push(`\t${itemId}["${escapeLabel(item)}"]:::${detectNodeType(item)}`);

			chain.push(itemId);
		}

		lines.push(`\t${chain.join(' --> ')}`);
	}

	lines.push(styles);

	return lines.join('\n');
}

function createRuntimeDiagram() {
	return [
		generatedHeader,
		mermaidInit,
		'flowchart LR',
		'\tsubgraph browser_runtime["Browser"]',
		'\t\tdirection TB',
		'\t\tpage["React route/page"]:::frontend',
		'\t\tauth_api["src/api/authApi.js"]:::frontend',
		'\t\thydration["React hydration"]:::frontend',
		'\t\tpage -->|API operation| auth_api',
		'\tend',
		'\tsubgraph node_runtime["Node / Express process"]',
		'\t\tdirection TB',
		'\t\texpress["Express application"]:::module',
		'\t\tboundary{"Request path"}:::boundary',
		'\t\tassets["Static assets from build/client"]:::ssr',
		'\t\tapi_pipeline["JSON + MariaDB session + CSRF"]:::middleware',
		'\t\tapi_routes["/api routes"]:::route',
		'\t\tmodules["Auth / Account / Admin modules"]:::module',
		'\t\tservices["Controllers and services"]:::service',
		'\t\trepositories["Repositories"]:::repository',
		'\t\tssr_handler["React Router Express handler"]:::ssr',
		'\t\trequest_context["Per-request Framework context"]:::ssr',
		'\t\tserver_bundle["Route loaders + build/server"]:::ssr',
		'\t\texpress --> boundary',
		'\t\tboundary -->|/assets/*| assets',
		'\t\tboundary -->|/api/*| api_pipeline --> api_routes --> modules --> services --> repositories',
		'\t\tboundary -->|Document URL| ssr_handler --> request_context --> server_bundle',
		'\tend',
		'\tdatabase[("MariaDB")]:::database',
		'\tpage -->|GET document| express',
		'\tauth_api -->|fetch /api/* with cookie + CSRF token| express',
		'\tassets -->|JavaScript and CSS| hydration',
		'\tserver_bundle -->|Streamed HTML + metadata| hydration',
		'\trepositories -->|Application data| database',
		'\tapi_pipeline -->|Session records| database',
		'\tapi_routes -->|JSON response| auth_api',
		'',
		'\tclassDef frontend fill:#3A8BC1,stroke:#216182,color:#fff;',
		'\tclassDef middleware fill:#CCA300,stroke:#A28100,color:#204E4A;',
		'\tclassDef route fill:#C43A47,stroke:#843145,color:#fff;',
		'\tclassDef service fill:#843145,stroke:#843145,color:#fff;',
		'\tclassDef repository fill:#3E6C67,stroke:#204E4A,color:#fff;',
		'\tclassDef module fill:#204E4A,stroke:#204E4A,color:#fff;',
		'\tclassDef ssr fill:#765898,stroke:#513C69,color:#fff;',
		'\tclassDef database fill:#E2DDD5,stroke:#204E4A,color:#204E4A;',
		'\tclassDef boundary fill:#fff,stroke:#204E4A,color:#204E4A;',
	].join('\n');
}

function createNavigationDiagram() {
	return [
		generatedHeader,
		mermaidInit,
		'flowchart TB',
		'\tvisitor([Visitor]):::actor',
		'\thome["/ Home"]:::publicPage',
		'\tregister["/register"]:::authPage',
		'\tverify["/verify-email"]:::authPage',
		'\tlogin["/login Password"]:::authPage',
		'\ttotp{"TOTP enabled?"}:::decision',
		'\tchallenge["/login TOTP challenge"]:::authPage',
		'\tpermissions{"users.manage?"}:::decision',
		'\tsecurity["/account/security"]:::privatePage',
		'\tadmin["/admin"]:::privatePage',
		'\tlogout["Logout"]:::action',
		'\tauthGuard["Authenticated visit to /login, /register, or /verify-email"]:::guard',
		'\tprivateGuard["Guest visit to /admin or /account/security"]:::guard',
		'',
		'\tvisitor --> home',
		'\thome -->|Register| register -->|Activation email| verify -->|Verified| login',
		'\thome -->|Login| login',
		'\tlogin -->|Password accepted| totp',
		'\ttotp -->|No| permissions',
		'\ttotp -->|Yes| challenge',
		'\tchallenge -->|Valid authenticator or recovery code| permissions',
		'\tchallenge -->|Invalid / pending| challenge',
		'\tpermissions -->|No| security',
		'\tpermissions -->|Yes| admin',
		'\tadmin <-->|Header navigation| security',
		'\tadmin --> logout --> login',
		'\tsecurity --> logout',
		'\tauthGuard -. "Redirect by permission" .-> permissions',
		'\tprivateGuard -. "Redirect" .-> login',
		'',
		'\tclassDef actor fill:#E2DDD5,stroke:#204E4A,color:#204E4A;',
		'\tclassDef publicPage fill:#3A8BC1,stroke:#216182,color:#fff;',
		'\tclassDef authPage fill:#CCA300,stroke:#A28100,color:#204E4A;',
		'\tclassDef privatePage fill:#204E4A,stroke:#204E4A,color:#fff;',
		'\tclassDef decision fill:#fff,stroke:#843145,color:#843145;',
		'\tclassDef action fill:#C43A47,stroke:#843145,color:#fff;',
		'\tclassDef guard fill:#F4F1EC,stroke:#765898,color:#513C69;',
	].join('\n');
}

function createRoutesIndex(features) {
	const lines = [generatedHeader, mermaidInit, 'flowchart LR'];

	let featureIndex = 0;
	let routeIndex = 0;

	for (const feature of features) {
		featureIndex += 1;

		const featureId = `feature_${featureIndex}_${safeId(feature.name)}`;

		lines.push(`\tsubgraph ${featureId}["${escapeLabel(humanize(feature.name))}"]`, '\t\tdirection TB');

		for (const route of feature.routes) {
			routeIndex += 1;

			lines.push(`\t\tindex_route_${routeIndex}["${escapeLabel(`${route.method} ${route.path}`)}"]:::route`);
		}

		lines.push('\tend');
	}

	lines.push(styles);

	return lines.join('\n');
}

async function collectFeature(moduleEntry, mounts) {
	const name = moduleEntry.name;

	const directory = path.join(modulesDirectory, name);

	const prefix = findFeaturePrefix(mounts, name);

	const routeFiles = (await findFilesRecursively(directory, (fileName) => fileName.endsWith('Routes.js'))).sort();

	const moduleFiles = (await findFilesRecursively(directory, (fileName) => fileName.endsWith('Module.js'))).sort();

	const dependencies = new Map();
	const routes = [];

	for (const moduleFile of moduleFiles) {
		const source = await fs.readFile(moduleFile, 'utf8');

		mergeDependencyMaps(dependencies, readFactoryDependencies(source));
	}

	for (const routeFile of routeFiles) {
		const source = await fs.readFile(routeFile, 'utf8');

		const groupName = getRouteGroup(directory, routeFile);

		routes.push(...readRoutes(source, prefix, groupName));
	}

	return {
		name,
		routes,
		dependencies,
	};
}

async function collectSharedApiFeature() {
	const routeFile = path.join(serverDirectory, 'routes', 'apiRoutes.js');

	try {
		const source = await fs.readFile(routeFile, 'utf8');

		return {
			name: 'api',

			routes: readRoutes(source, '/api', 'API'),

			dependencies: new Map(),
		};
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

function renderDiagram(sourcePath, svgPath, puppeteerConfigPath) {
	const result = spawnSync(
		mermaidCommand,
		['--input', sourcePath, '--output', svgPath, '--backgroundColor', 'white', '--puppeteerConfigFile', puppeteerConfigPath],
		{
			cwd: rootDirectory,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);

	if (result.error) {
		throw new Error(`Unable to run Mermaid CLI: ${result.error.message}`);
	}

	if (result.status !== 0) {
		const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();

		throw new Error(`Mermaid CLI exited with code ${result.status}${details ? `:\n${details}` : ''}`);
	}
}

async function saveDiagram(fileName, content, puppeteerConfigPath) {
	const sourcePath = path.join(sourceDirectory, `${fileName}.mmd`);
	const svgPath = path.join(outputDirectory, `${fileName}.svg`);

	await fs.writeFile(sourcePath, content, 'utf8');
	renderDiagram(sourcePath, svgPath, puppeteerConfigPath);
}

async function main() {
	await fs.rm(outputDirectory, {
		recursive: true,
		force: true,
	});

	await fs.mkdir(sourceDirectory, {
		recursive: true,
	});

	const browserExecutablePath = chromium.executablePath();

	if (!fsSync.existsSync(browserExecutablePath)) {
		throw new Error('Playwright Chromium is required to render Mermaid SVGs. Run: npx playwright install chromium');
	}

	const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'omdn-mermaid-'));
	const puppeteerConfigPath = path.join(temporaryDirectory, 'puppeteer.json');

	await fs.writeFile(
		puppeteerConfigPath,
		JSON.stringify({
			args: ['--no-sandbox'],
			executablePath: browserExecutablePath,
		}),
		'utf8',
	);

	try {
		const expressAppSource = await fs.readFile(path.join(serverDirectory, 'expressApp.js'), 'utf8');

		const mounts = readExpressMounts(expressAppSource);

		await saveDiagram('application', createApplicationDiagram(mounts), puppeteerConfigPath);
		await saveDiagram('overview', createRuntimeDiagram(), puppeteerConfigPath);
		await saveDiagram('navigation', createNavigationDiagram(), puppeteerConfigPath);

		const moduleEntries = (
			await fs.readdir(modulesDirectory, {
				withFileTypes: true,
			})
		)
			.filter((entry) => entry.isDirectory())
			.sort((left, right) => left.name.localeCompare(right.name));

		const features = [];

		for (const moduleEntry of moduleEntries) {
			features.push(await collectFeature(moduleEntry, mounts));
		}

		const apiFeature = await collectSharedApiFeature();

		if (apiFeature) {
			features.push(apiFeature);
		}

		for (const feature of features) {
			await saveDiagram(feature.name, createFeatureDiagram(feature), puppeteerConfigPath);
		}

		await saveDiagram('routes', createRoutesIndex(features), puppeteerConfigPath);

		const routeCount = features.reduce((total, feature) => total + feature.routes.length, 0);

		console.log(`Generated ${routeCount} routes and ${features.length + 4} runtime SVGs in ${outputDirectory}`);
	} finally {
		await fs.rm(temporaryDirectory, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
