// Talks to the ArcadeScore/ArcadeMessage models on Nextlayer3D's shared
// AppSync API (see amplify/data/resource.ts in the Tasker/Nextlayer3D repo,
// and amplifyConfig.js for the endpoint). Nextplayer is plain JS with no
// generated Schema type, so this hand-writes the GraphQL Amplify would
// otherwise generate, using generateClient()'s raw `.graphql()` escape
// hatch instead of the typed `client.models.X` API.
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

// Reads use the guest/identityPool role (configured as the default auth
// mode) so signed-out visitors can see scores and chat. Writes need a real
// signed-in user, so they explicitly ask for 'userPool' auth instead.
const READ_AUTH = 'identityPool';
const WRITE_AUTH = 'userPool';

// Public display name for a signed-in user — the arcade has no separate
// username field, so this derives one from the email's local part rather
// than showing the real address (same "don't expose real emails" pattern
// Nextlayer3D uses for GalleryPost's authorUsername).
export function displayNameFor(email) {
  if (!email) return 'Anonymous';
  return email.split('@')[0];
}

const LIST_SCORES = /* GraphQL */ `
  query ListArcadeScores($filter: ModelArcadeScoreFilterInput, $limit: Int) {
    listArcadeScores(filter: $filter, limit: $limit) {
      items { id gameId score playerName authorEmail createdAt }
    }
  }
`;

const CREATE_SCORE = /* GraphQL */ `
  mutation CreateArcadeScore($input: CreateArcadeScoreInput!) {
    createArcadeScore(input: $input) { id gameId score playerName createdAt }
  }
`;

const LIST_MESSAGES = /* GraphQL */ `
  query ListArcadeMessages($filter: ModelArcadeMessageFilterInput, $limit: Int) {
    listArcadeMessages(filter: $filter, limit: $limit) {
      items { id channel text authorName createdAt }
    }
  }
`;

const CREATE_MESSAGE = /* GraphQL */ `
  mutation CreateArcadeMessage($input: CreateArcadeMessageInput!) {
    createArcadeMessage(input: $input) { id channel text authorName createdAt }
  }
`;

const LIST_MY_SCORES = /* GraphQL */ `
  query ListMyArcadeScores($filter: ModelArcadeScoreFilterInput, $limit: Int) {
    listArcadeScores(filter: $filter, limit: $limit) {
      items { id gameId score createdAt }
    }
  }
`;

// Top scores for one game, highest first. Fetches a generous page and
// sorts/trims client-side rather than a secondary index — this table won't
// be huge, and every other model in this schema does the same thing.
// `ascending` is for time-based games (e.g. Drift Racer's lap time) where a
// LOWER stored score is the better result.
export async function listTopScores(gameId, limit = 10, ascending = false) {
  const res = await client.graphql({
    query: LIST_SCORES,
    variables: { filter: { gameId: { eq: gameId } }, limit: 200 },
    authMode: READ_AUTH,
  });
  const items = res.data?.listArcadeScores?.items || [];
  const sorted = ascending
    ? items.sort((a, b) => a.score - b.score)
    : items.sort((a, b) => b.score - a.score);
  return sorted.slice(0, limit);
}

export async function submitScore(gameId, score, playerName, authorEmail) {
  const res = await client.graphql({
    query: CREATE_SCORE,
    variables: { input: { gameId, score, playerName, authorEmail } },
    authMode: WRITE_AUTH,
  });
  return res.data?.createArcadeScore;
}

// `channel` is 'chat:global' or `leaderboard:<gameId>` — see resource.ts.
export async function listMessages(channel, limit = 50) {
  const res = await client.graphql({
    query: LIST_MESSAGES,
    variables: { filter: { channel: { eq: channel } }, limit: 200 },
    authMode: READ_AUTH,
  });
  const items = res.data?.listArcadeMessages?.items || [];
  return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-limit);
}

export async function postMessage(channel, text, authorName, authorEmail) {
  const res = await client.graphql({
    query: CREATE_MESSAGE,
    variables: { input: { channel, text, authorName, authorEmail } },
    authMode: WRITE_AUTH,
  });
  return res.data?.createArcadeMessage;
}

// Every score a signed-in player has ever submitted, across every game —
// powers the Profile page's per-game bests and achievement badges.
export async function listMyScores(email) {
  if (!email) return [];
  const res = await client.graphql({
    query: LIST_MY_SCORES,
    variables: { filter: { authorEmail: { eq: email } }, limit: 500 },
    authMode: READ_AUTH,
  });
  return res.data?.listArcadeScores?.items || [];
}
