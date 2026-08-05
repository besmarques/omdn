import { Link } from 'react-router';

export default function SiteHeader() {
	return (
		<header>
			<nav aria-label="Main navigation">
				<Link to="/">Home</Link> <Link to="/recipes">Receitas</Link> <Link to="/articles">Artigos</Link> <Link to="/login">Login</Link>{' '}
				<Link to="/register">Register</Link>
			</nav>
		</header>
	);
}
