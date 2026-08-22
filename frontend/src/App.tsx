import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Agenda } from "./pages/Agenda";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/agenda" element={<Agenda />} />
      </Route>
      <Route path="*" element={<Navigate to="/agenda" replace />} />
    </Routes>
  );
}
