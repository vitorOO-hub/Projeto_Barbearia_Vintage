import { Routes, Route, Navigate, Link, Outlet } from "react-router-dom";
import { Login } from "./pages/Login";
import { Agenda } from "./pages/Agenda";
import { Clientes } from "./pages/Clientes";
import { Servicos } from "./pages/Servicos";
import { Dashboard } from "./pages/Dashboard";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function Layout() {
  return (
    <div>
      <nav className="flex gap-4 border-b bg-white p-4">
        <Link to="/agenda" className="font-medium text-gray-700">Agenda</Link>
        <Link to="/clientes" className="font-medium text-gray-700">Clientes</Link>
        <Link to="/servicos" className="font-medium text-gray-700">Serviços</Link>
        <Link to="/dashboard" className="font-medium text-gray-700">Resumo</Link>
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
