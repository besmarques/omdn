import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export default function createLocalMediaStorage(root) {
	function resolveKey(key) {
		const resolved = path.resolve(root, key);
		if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new RangeError('Invalid media storage key');
		return resolved;
	}
	return {
		async deletePrefix(prefix) {
			await rm(resolveKey(prefix), { force: true, recursive: true });
		},
		read(key) {
			return readFile(resolveKey(key));
		},
		async write(key, data) {
			const filename = resolveKey(key);
			await mkdir(path.dirname(filename), { recursive: true });
			await writeFile(filename, data, { flag: 'wx' });
		},
	};
}
