import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
	throw new Error('Dependency graph generation is disabled in production');
}

const outputDirectory = path.resolve('docs');
const dependencyCruiserCommand = process.platform === 'win32' ? 'depcruise.cmd' : 'depcruise';
const graphvizCommand = process.platform === 'win32' ? 'dot.exe' : 'dot';
const commonExclude = '([.]test[.]|^src/components/ui/|^src/hooks/use-mobile[.]js$|^src/lib/utils[.]js$|^src/pages/dev/)';

const graphs = [
	{
		name: 'Architecture overview',
		sources: ['src', 'server'],
		includeOnly: '^(src|server)',
		collapse: '^(server/modules/[^/]+|server/(config|dbConnect|middleware|routes)|src/(api|pages|router))',
		outputBaseName: 'dependency-graph',
	},
	{
		name: 'Server domains',
		sources: ['server'],
		includeOnly: '^server',
		collapse: '^(server/modules/[^/]+|server/(config|dbConnect|middleware|routes))',
		outputBaseName: 'dependency-server',
	},
	{
		name: 'Frontend core',
		sources: ['src'],
		includeOnly: '^src',
		outputBaseName: 'dependency-frontend',
	},
];

function run(command, args) {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	if (result.error) {
		throw new Error(`Unable to run ${command}: ${result.error.message}`);
	}

	if (result.status !== 0) {
		const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();

		throw new Error(`${command} exited with code ${result.status}${details ? `:\n${details}` : ''}`);
	}

	return result;
}

function generateGraph(graph) {
	const dotPath = path.join(outputDirectory, `${graph.outputBaseName}.dot`);
	const svgPath = path.join(outputDirectory, `${graph.outputBaseName}.svg`);
	const dependencyCruiserArguments = [
		...graph.sources,
		'--include-only',
		graph.includeOnly,
		'--exclude',
		commonExclude,
		...(graph.collapse ? ['--collapse', graph.collapse] : []),
		'--output-type',
		'dot',
		'--output-to',
		dotPath,
	];

	run(dependencyCruiserCommand, dependencyCruiserArguments);
	run(graphvizCommand, ['-Tsvg', dotPath, '-o', svgPath]);

	console.log(`✓ ${graph.name}: ${path.relative(process.cwd(), svgPath)}`);
}

fs.mkdirSync(outputDirectory, { recursive: true });

for (const graph of graphs) {
	generateGraph(graph);
}
