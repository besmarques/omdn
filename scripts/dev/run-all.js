import { spawnSync } from 'node:child_process';
import process from 'node:process';

const npmCli = process.env.npm_execpath;

if (!npmCli) {
	console.error('Unable to locate the npm CLI.');
	process.exit(1);
}

const tasks = [
	{
		name: 'Format',
		script: 'format',
	},
	{
		name: 'Lint',
		script: 'lint',
	},
	{
		name: 'Tests',
		script: 'test',
	},
	{
		name: 'Diagrams',
		script: 'diagram:all',
	},
];

for (const task of tasks) {
	console.log(`\n========================================`);
	console.log(`Running: npm run ${task.script}`);
	console.log(`========================================\n`);

	const result = spawnSync(process.execPath, [npmCli, 'run', task.script], {
		stdio: 'inherit',
		env: process.env,
	});

	if (result.error) {
		console.error(`\n${task.name} could not be started:`, result.error.message);

		process.exit(1);
	}

	if (result.status !== 0) {
		console.error(`\n${task.name} failed with exit code ${result.status}.`);

		process.exit(result.status ?? 1);
	}
}

console.log('\n========================================');
console.log('All tasks completed successfully.');
console.log('========================================\n');
