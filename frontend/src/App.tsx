import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { Login } from "./pages/Login";
import { Database } from "./pages/Database";
import { ColorScheme } from "./pages/ColorScheme";
import { Logs } from "./pages/Logs";
import { LayoutEditor } from "./pages/LayoutEditor";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { authenticated } = useAuth();
  if (authenticated === null) return <LoadingIndicator />;
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
    <AuthProvider>
      <ThemeProvider>
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
              <Route path="/logs" element={<Logs />} />
              <Route path="/layout" element={<LayoutEditor />} />
              <Route path="/" element={<Navigate to="/database" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/database" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
