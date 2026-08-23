import { Routes, Route, Navigate, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Agenda } from "./pages/Agenda";
import { Clientes } from "./pages/Clientes";
import { Servicos } from "./pages/Servicos";
import { Barbeiros } from "./pages/Barbeiros";
import { Dashboard } from "./pages/Dashboard";
import { Usuarios } from "./pages/Usuarios";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AdminRoute } from "./routes/AdminRoute";
import { useAuth } from "./context/AuthContext";

const NAV_ITEMS = [
  { to: "/agenda", label: "Agenda" },
  { to: "/clientes", label: "Clientes" },
  { to: "/servicos", label: "Serviços" },
  { to: "/barbeiros", label: "Barbeiros" },
  { to: "/dashboard", label: "Resumo" },
];

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const navItems = user?.is_admin ? [...NAV_ITEMS, { to: "/usuarios", label: "Usuários" }] : NAV_ITEMS;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream">
      <nav className="nav-bar">
        <span className="mr-2 hidden font-display text-lg font-semibold text-ink sm:inline">Barbearia Vintage</span>
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-link ${location.pathname === item.to ? "nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
        <button onClick={handleLogout} className="nav-link ml-auto" aria-label="Sair">
          Sair
        </button>
      </nav>
      <Outlet />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/barbeiros" element={<Barbeiros />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route element={<AdminRoute />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/agenda" replace />} />
    </Routes>
  );
}
