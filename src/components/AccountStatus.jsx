import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function AccountStatus() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Link
      to="/account"
      className={`np-pad-status ${user ? 'on' : ''}`}
      title={user ? `Signed in as ${user.email}` : 'Sign in'}
    >
      <span className="np-pad-dot" />
      <span className="np-pad-text">{user ? user.email : 'Sign In'}</span>
    </Link>
  );
}
