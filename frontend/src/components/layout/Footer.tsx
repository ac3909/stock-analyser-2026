/** App footer with data attribution and disclaimer. */
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400">
        <p>Data provided by Yahoo Finance. Not financial advice.</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} StockLens</p>
      </div>
    </footer>
  );
}
