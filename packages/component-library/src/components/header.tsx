import { Link } from "@remix-run/react";

export function Header() {
  return (
    <header className="flex items-center justify-between w-full h-16 px-4 bg-gray-800">
      <Link to="/" className="text-xl font-bold text-white">
        Remix
      </Link>
      <nav className="flex items-center justify-center space-x-4">
        <Link to="/" className="text-white">
          Home
        </Link>
        <Link to="/blog" className="text-white">
          Blog
        </Link>
      </nav>
    </header>
  );
}
