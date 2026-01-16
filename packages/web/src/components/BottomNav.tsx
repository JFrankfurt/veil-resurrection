import { Link, useLocation } from "react-router-dom";

export function BottomNav() {
  const location = useLocation();
  
  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center">
        <NavItem
          to="/"
          active={location.pathname === "/"}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          label="Markets"
        />
        <NavItem
          to="/portfolio"
          active={location.pathname === "/portfolio"}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          }
          label="Portfolio"
        />
      </div>
    </nav>
  );
}

function NavItem({
  to,
  active,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={`bottom-nav-item ${active ? "active" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
