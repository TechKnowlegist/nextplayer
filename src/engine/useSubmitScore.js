import { useCallback } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { submitScore, displayNameFor } from './arcadeApi';

// Returns a function games call from their own endGame() with the final
// score. Silently does nothing for signed-out players — guest play stays
// fully intact, they just don't show up on the shared leaderboard (their
// local best-score tracking is untouched either way).
export function useSubmitScore(gameId) {
  const { user } = useAuth();
  return useCallback(
    (score) => {
      if (!user || !score) return;
      submitScore(gameId, score, displayNameFor(user.email), user.email).catch((err) =>
        console.log('Nextplayer — score submit failed:', err)
      );
    },
    [user, gameId]
  );
}
