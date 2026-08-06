import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../../components/ui/carousel';

function ResponsiveImage({ image, loading = 'lazy' }) {
	const variants = [...image.variants].sort((a, b) => a.width - b.width);
	const largest = variants.at(-1);
	if (!largest) return null;
	return (
		<img
			alt={image.altText}
			height={largest.height}
			loading={loading}
			sizes="(max-width: 768px) 100vw, 1200px"
			src={largest.url}
			srcSet={variants.map((variant) => `${variant.url} ${variant.width}w`).join(', ')}
			width={largest.width}
		/>
	);
}

export default function PostMediaDisplay({ media }) {
	if (!media?.featured && !media?.gallery?.length) return null;
	return (
		<>
			{media.featured && (
				<figure className="post-featured-image">
					<ResponsiveImage image={media.featured} loading="eager" />
				</figure>
			)}
			{media.gallery?.length > 0 && (
				<section aria-label="Image gallery" className="mx-auto max-w-5xl px-12">
					<Carousel opts={{ loop: media.gallery.length > 1 }}>
						<CarouselContent>
							{media.gallery.map((image) => (
								<CarouselItem key={`${image.uuid}-${image.sortPosition}`}>
									<ResponsiveImage image={image} />
								</CarouselItem>
							))}
						</CarouselContent>
						{media.gallery.length > 1 && (
							<>
								<CarouselPrevious />
								<CarouselNext />
							</>
						)}
					</Carousel>
				</section>
			)}
		</>
	);
}
