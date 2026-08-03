import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Database } from "./pages/Database";
import { ColorScheme } from "./pages/ColorScheme";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { authenticated } = useAuth();
  if (authenticated === null) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}


function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const { authenticated } = useAuth();
  if (authenticated) return <Navigate to="/database" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <Login />
                </RedirectIfAuthed>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/database" element={<Database />} />
              <Route path="/colors" element={<ColorScheme />} />
              <Route path="/" element={<Navigate to="/database" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/database" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
