import { createContext } from 'react-router';

const sharedContextsKey = Symbol.for('omdn.framework-contexts.v1');
const sharedContexts =
	globalThis[sharedContextsKey] ??
	Object.freeze({
		applicationServices: createContext(),
		clock: createContext(),
		principal: createContext(),
		requestId: createContext(),
	});

globalThis[sharedContextsKey] = sharedContexts;

export const applicationServicesContext = sharedContexts.applicationServices;
export const clockContext = sharedContexts.clock;
export const principalContext = sharedContexts.principal;
export const requestIdContext = sharedContexts.requestId;
