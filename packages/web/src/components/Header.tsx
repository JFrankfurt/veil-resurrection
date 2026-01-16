import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-card))]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[rgb(var(--accent-primary))] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white sm:w-5 sm:h-5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
                  <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[rgb(var(--text-primary))]">
                Veil
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" active={location.pathname === "/"}>
                Markets
              </NavLink>
              <NavLink to="/portfolio" active={location.pathname === "/portfolio"}>
                Portfolio
              </NavLink>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Wallet - Compact on mobile */}
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        style: {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              className="btn btn-primary text-sm px-4"
                            >
                              <span className="hidden sm:inline">Connect Wallet</span>
                              <span className="sm:hidden">Connect</span>
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              className="btn bg-[rgb(var(--error-light))] text-[rgb(var(--error))] border border-[rgb(var(--error))]/20 text-sm px-3"
                            >
                              Wrong Network
                            </button>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={openChainModal}
                              className="btn btn-ghost p-2 sm:px-3"
                            >
                              {chain.hasIcon && chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              )}
                            </button>

                            <button
                              onClick={openAccountModal}
                              className="btn btn-secondary flex items-center gap-2 px-3"
                            >
                              <span className="w-2 h-2 rounded-full bg-[rgb(var(--success))]" />
                              <span className="font-mono text-sm">
                                {account.displayName}
                              </span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -mr-2 rounded-lg text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-elevated))]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-card))]">
            <nav className="px-4 py-3 space-y-1">
              <MobileNavLink
                to="/"
                active={location.pathname === "/"}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Markets
              </MobileNavLink>
              <MobileNavLink
                to="/portfolio"
                active={location.pathname === "/portfolio"}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                Portfolio
              </MobileNavLink>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-[rgb(var(--accent-light))] text-[rgb(var(--accent-primary))]"
          : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-elevated))]"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  to,
  active,
  onClick,
  children,
}: {
  to: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
        active
          ? "bg-[rgb(var(--accent-light))] text-[rgb(var(--accent-primary))]"
          : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-elevated))]"
      }`}
    >
      {children}
    </Link>
  );
}
