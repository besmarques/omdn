import { PassThrough } from 'node:stream';

import { createReadableStreamFromReadable } from '@react-router/node';
import { isbot } from 'isbot';
import { ServerRouter } from 'react-router';
import { renderToPipeableStream } from 'react-dom/server';

export const streamTimeout = 5000;

export default function handleRequest(request, responseStatusCode, responseHeaders, routerContext) {
	if (request.method.toUpperCase() === 'HEAD') {
		return new Response(null, {
			status: responseStatusCode,
			headers: responseHeaders,
		});
	}

	const nonce = request.headers.get('x-omdn-csp-nonce');

	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const userAgent = request.headers.get('user-agent');
		const readyOption = userAgent && isbot(userAgent) ? 'onAllReady' : 'onShellReady';
		let timeoutId = setTimeout(() => abort(), streamTimeout + 1000);
		const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} nonce={nonce} />, {
			nonce,
			[readyOption]() {
				shellRendered = true;
				const body = new PassThrough({
					final(callback) {
						clearTimeout(timeoutId);
						timeoutId = undefined;
						callback();
					},
				});

				responseHeaders.set('Content-Type', 'text/html');
				pipe(body);

				resolve(
					new Response(createReadableStreamFromReadable(body), {
						headers: responseHeaders,
						status: responseStatusCode,
					}),
				);
			},
			onShellError(error) {
				reject(error);
			},
			onError(error) {
				responseStatusCode = 500;

				if (shellRendered) {
					console.error('React Router streaming render failed', error);
				}
			},
		});
	});
}
