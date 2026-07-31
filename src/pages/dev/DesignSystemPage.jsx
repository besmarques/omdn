import { Button } from '@/components/ui/button';

export default function DesignSystemPage() {
	return (
		<main className="space-y-8 p-10">
			<header>
				<h1 className="text-4xl font-bold">Design System</h1>
			</header>

			<section className="flex flex-wrap gap-4">
				<Button>Default</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="destructive">Destructive</Button>
			</section>
		</main>
	);
}
