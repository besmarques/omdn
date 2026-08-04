import { NewsletterBlock, RelatedPostsBlock } from './blocks/Blocks';
import FullWidthLayout from './layouts/FullWidthLayout';
import SidebarLayout from './layouts/SidebarLayout';
import StandardFooter from './regions/Footer';
import { HeroHeader, MinimalHeader } from './regions/Headers';
import GiftIdeasTemplate from '../content/gifts/GiftIdeasTemplate';
import RecipeTemplate from '../content/recipes/RecipeTemplate';

export const presentationRegistry = Object.freeze({
	blocks: Object.freeze({
		newsletter: NewsletterBlock,
		'related-posts': RelatedPostsBlock,
	}),
	footers: Object.freeze({
		standard: StandardFooter,
	}),
	headers: Object.freeze({
		hero: HeroHeader,
		minimal: MinimalHeader,
	}),
	layouts: Object.freeze({
		'full-width': FullWidthLayout,
		sidebar: SidebarLayout,
	}),
	templates: Object.freeze({
		'gift-ideas': GiftIdeasTemplate,
		recipe: RecipeTemplate,
	}),
});
