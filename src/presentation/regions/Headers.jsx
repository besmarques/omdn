export function HeroHeader({ content, settings }) {
	return (
		<header>
			<p>{settings.eyebrow}</p>
			<h2>{content.title}</h2>
			{settings.message && <p>{settings.message}</p>}
		</header>
	);
}

export function MinimalHeader({ content }) {
	return (
		<header>
			<a href="/">O Melhor do Natal</a>
			<span> / {content.title}</span>
		</header>
	);
}
