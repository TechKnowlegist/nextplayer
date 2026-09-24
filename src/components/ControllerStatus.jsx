import { Link } from 'react-router-dom';
import { useControllerStatus } from '../engine/useController';

export default function ControllerStatus() {
  const { connected, name } = useControllerStatus();
  return (
    <Link
      to="/controller"
      className={`np-pad-status ${connected ? 'on' : ''}`}
      title={connected ? `${name} connected` : 'No controller yet'}
    >
      <span className="np-pad-dot" />
      <span className="np-pad-text">
        {connected ? `${name} connected` : 'Press any button on your controller'}
      </span>
    </Link>
  );
}
