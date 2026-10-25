import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from './Spinner';

// Redirects to /login when there is no session. (The backend enforces auth independently.)
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking session..." />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
