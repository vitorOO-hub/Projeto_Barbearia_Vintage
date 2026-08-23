import { Routes, Route, Navigate, Link, Outlet, useLocation } from "react-router-dom";
import { Login } from "./pages/Login";
import { Agenda } from "./pages/Agenda";
import { Clientes } from "./pages/Clientes";
import { Servicos } from "./pages/Servicos";
import { Dashboard } from "./pages/Dashboard";
import { ProtectedRoute } from "./routes/ProtectedRoute";

const NAV_ITEMS = [
  { to: "/agenda", label: "Agenda" },
  { to: "/clientes", label: "Clientes" },
  { to: "/servicos", label: "Serviços" },
  { to: "/dashboard", label: "Resumo" },
];

function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream">
      <nav className="nav-bar">
        <span className="mr-2 hidden font-display text-lg font-semibold text-ink sm:inline">Barbearia Vintage</span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-link ${location.pathname === item.to ? "nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
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
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/agenda" replace />} />
    </Routes>
  );
}
