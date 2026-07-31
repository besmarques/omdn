import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
	throw new Error('Logic maps are disabled in production.');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const server = path.join(root, 'server');
const modulesDirectory = path.join(server, 'modules');
const output = path.join(root, 'docs', 'logic');

const header = ['%% AUTO-GENERATED — DO NOT EDIT', '%% Run: npm run logic-map', ''].join('\n');

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
		} else {
			current += character;
		}
	}

	if (current.trim()) {
		result.push(current.trim());
	}

	return result;
}

function findCalls(source, regularExpression) {
	const result = [];
	let match;

	regularExpression.lastIndex = 0;

	while ((match = regularExpression.exec(source))) {
		const openingIndex = regularExpression.lastIndex - 1;

		const closingIndex = findClosingParenthesis(source, openingIndex);

		if (closingIndex < 0) {
			continue;
		}

		result.push({
			match,
			arguments: splitArguments(source.slice(openingIndex + 1, closingIndex)),
		});

		regularExpression.lastIndex = closingIndex + 1;
	}

	return result;
}

function removeQuotes(value) {
	const text = value.trim();

	return /^(['"`]).*\1$/s.test(text) ? text.slice(1, -1) : text;
}

function normalizeFactoryName(name) {
	const value = name.replace(/^create/, '');

	return value ? value[0].toLowerCase() + value.slice(1) : name;
}

function describeArgument(argument) {
	const text = argument.trim();

	if (/^[A-Za-z_$][\w$]*$/.test(text)) {
		return text;
	}

	if (text.includes('=>') || text.startsWith('function') || text.startsWith('async ')) {
		return 'inlineHandler';
	}

	const call = text.match(/^([A-Za-z_$][\w$.]*)\s*\((.*)\)$/s);

	if (!call) {
		return text.replaceAll(/\s+/g, ' ').slice(0, 60);
	}

	const name = normalizeFactoryName(call[1]);

	const argumentsText = splitArguments(call[2]).map(removeQuotes).join(', ');

	return argumentsText ? `${name}(${argumentsText})` : name;
}

function getNodeType(label) {
	const value = label.toLowerCase();

	if (/^[A-Z]+ \//.test(label) || value.includes('routes')) {
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

class MermaidGraph {
	constructor(direction = 'LR') {
		this.direction = direction;
		this.ids = new Map();
		this.nodes = [];
		this.edges = [];
	}

	addNode(label, type = getNodeType(label)) {
		const key = `${type}:${label}`;

		if (!this.ids.has(key)) {
			const id = `n${this.ids.size + 1}`;

			this.ids.set(key, id);

			this.nodes.push(`\t${id}["${label.replaceAll('"', '&quot;')}"]:::${type}`);
		}

		return this.ids.get(key);
	}

	addEdge(from, to, fromType, toType) {
		this.edges.push(`\t${this.addNode(from, fromType)} --> ${this.addNode(to, toType)}`);
	}

	toString() {
		return [header, `flowchart ${this.direction}`, ...this.nodes, ...this.edges, styles].join('\n');
	}
}

function readRoutes(source, prefix) {
	return findCalls(source, /\brouter\.(get|post|put|patch|delete|options|head)\s*\(/g).map(({ match, arguments: argumentsList }) => ({
		method: match[1].toUpperCase(),
		path: `${prefix}${removeQuotes(argumentsList[0])}`,
		handlers: argumentsList.slice(1).map(describeArgument),
	}));
}

function readComposition(source) {
	const assignments = findCalls(source, /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(create[A-Z][\w$]*)\s*\(/g).map(
		({ match, arguments: argumentsList }) => ({
			variable: match[1],
			arguments: argumentsList,
		}),
	);

	const knownVariables = new Set(assignments.map(({ variable }) => variable));

	const edges = [];

	for (const assignment of assignments) {
		const identifiers = assignment.arguments.join(' ').match(/\b[A-Za-z_$][\w$]*\b/g) ?? [];

		for (const dependency of identifiers) {
			if (knownVariables.has(dependency)) {
				edges.push([assignment.variable, dependency]);
			}
		}
	}

	return {
		assignments,
		edges,
	};
}

async function exists(target) {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

async function saveDiagram(name, graph) {
	await fs.writeFile(path.join(output, name), graph.toString(), 'utf8');
}

function addRoutesToGraph(graph, routes) {
	for (const route of routes) {
		let previous = `${route.method} ${route.path}`;

		graph.addNode(previous, 'route');

		for (const handler of route.handlers) {
			graph.addEdge(previous, handler);
			previous = handler;
		}
	}
}

async function main() {
	await fs.rm(output, {
		recursive: true,
		force: true,
	});

	await fs.mkdir(output, {
		recursive: true,
	});

	const expressAppSource = await fs.readFile(path.join(server, 'expressApp.js'), 'utf8');

	const mounts = findCalls(expressAppSource, /\bapp\.use\s*\(/g)
		.filter(({ arguments: argumentsList }) => /^['"`]/.test(argumentsList[0] ?? ''))
		.map(({ arguments: argumentsList }) => ({
			prefix: removeQuotes(argumentsList[0]),
			chain: argumentsList.slice(1).map(describeArgument),
		}));

	const applicationGraph = new MermaidGraph('LR');

	for (const mount of mounts) {
		applicationGraph.addEdge('Express app', mount.prefix, 'module', 'route');

		let previous = mount.prefix;

		for (const item of mount.chain) {
			applicationGraph.addEdge(previous, item);
			previous = item;
		}
	}

	await saveDiagram('application.mmd', applicationGraph);

	const moduleEntries = await fs.readdir(modulesDirectory, {
		withFileTypes: true,
	});

	const allRoutes = [];

	for (const entry of moduleEntries.filter((item) => item.isDirectory())) {
		const name = entry.name;

		const moduleDirectory = path.join(modulesDirectory, name);

		const routesFile = path.join(moduleDirectory, `${name}Routes.js`);

		const moduleFile = path.join(moduleDirectory, `${name}Module.js`);

		if (!(await exists(routesFile))) {
			continue;
		}

		const mount = mounts.find(({ chain }) => chain.some((item) => item.startsWith(`${name}Module`)));

		const prefix = mount?.prefix ?? `/api/${name}`;

		const routes = readRoutes(await fs.readFile(routesFile, 'utf8'), prefix);

		allRoutes.push(...routes);

		const moduleGraph = new MermaidGraph('LR');

		addRoutesToGraph(moduleGraph, routes);

		if (await exists(moduleFile)) {
			const composition = readComposition(await fs.readFile(moduleFile, 'utf8'));

			for (const [from, to] of composition.edges) {
				moduleGraph.addEdge(from, to);
			}

			const repository = composition.assignments.find(({ variable }) => variable.toLowerCase().includes('repository'))?.variable;

			if (repository) {
				moduleGraph.addEdge(repository, 'MariaDB', 'repository', 'database');
			}
		}

		await saveDiagram(`${name}.mmd`, moduleGraph);
	}

	const sharedApiRoutesFile = path.join(server, 'routes', 'apiRoutes.js');

	if (await exists(sharedApiRoutesFile)) {
		const sharedRoutes = readRoutes(await fs.readFile(sharedApiRoutesFile, 'utf8'), '/api');

		allRoutes.push(...sharedRoutes);

		const apiGraph = new MermaidGraph('LR');

		addRoutesToGraph(apiGraph, sharedRoutes);

		await saveDiagram('api.mmd', apiGraph);
	}

	const routesGraph = new MermaidGraph('TD');

	addRoutesToGraph(routesGraph, allRoutes);

	await saveDiagram('routes.mmd', routesGraph);

	console.log(`Generated ${allRoutes.length} routes in ${output}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
