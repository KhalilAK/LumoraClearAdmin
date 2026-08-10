import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { Login } from "./pages/Login";
import { Database } from "./pages/Database";
import { Logs } from "./pages/Logs";
import { Updates } from "./pages/Updates";
import { EditPage } from "./pages/EditPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { authenticated } = useAuth();
  if (authenticated === null) return <LoadingIndicator />;
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}


function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const { authenticated } = useAuth();
  if (authenticated) return <Navigate to="/logs" replace />;
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
              <Route path="/logs" element={<Logs />} />
              <Route path="/edit" element={<EditPage />} />
              <Route path="/updates" element={<Updates />} />
              <Route path="/database" element={<Database />} />
              <Route path="/" element={<Navigate to="/logs" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/logs" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
