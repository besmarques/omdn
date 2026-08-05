export default function AdminSectionPage({ description, title }) {
	return (
		<main className="p-6">
			<h1 className="text-4xl font-bold">{title}</h1>
			<p>{description}</p>
		</main>
	);
}
