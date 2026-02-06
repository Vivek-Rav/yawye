export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <p className="text-6xl mb-4">🍽️</p>
      <h1 className="text-white text-2xl font-extrabold mb-2">Page not found</h1>
      <p className="text-gray-500 text-sm mb-6">
        This page doesn&apos;t exist. Maybe it got eaten.
      </p>
      <a
        href="/"
        className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
      >
        Back to home
      </a>
    </div>
  );
}
