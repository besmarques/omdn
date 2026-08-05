import { useSyncExternalStore } from 'react';

function subscribe(onHydrated) {
	queueMicrotask(onHydrated);
	return () => {};
}

export default function useHydrated() {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
