import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="relative flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[rgb(var(--border-subtle))] mt-24 bg-[rgb(var(--bg-card))]">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[rgb(var(--text-muted))] text-sm">
            <span>Built on</span>
            <svg width="20" height="20" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
            </svg>
            <span className="text-[rgb(var(--accent-primary))] font-semibold">Base</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[rgb(var(--text-muted))]">
            <a href="#" className="hover:text-[rgb(var(--text-primary))] transition-colors">Docs</a>
            <a href="#" className="hover:text-[rgb(var(--text-primary))] transition-colors">GitHub</a>
            <a href="#" className="hover:text-[rgb(var(--text-primary))] transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
