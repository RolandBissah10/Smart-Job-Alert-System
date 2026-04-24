import { Navigate } from 'react-router-dom';

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!token && !refreshToken) return <Navigate to="/login" replace />;

  if (token && isTokenExpired(token) && !refreshToken) {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  return children;
}
