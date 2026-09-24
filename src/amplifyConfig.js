// Nextplayer has no Cognito pool of its own — it deliberately points at
// Nextlayer3D's existing user pool so a Nextlayer3D account works here
// too (see amplify/auth/resource.ts in the Tasker/Nextlayer3D repo).
// These values aren't secrets (the same ones ship in Nextlayer3D's own
// committed amplify_outputs.json) — just the public pool/client IDs a
// browser needs to talk to Cognito.
//
// This is a *shared account*, not shared-session SSO: being signed in
// on nextlayer3d.app won't automatically sign you in here too, since
// each subdomain keeps its own browser-local auth session. Same
// credentials work on both, you just sign in once per site.
//
// If Nextlayer3D's sandbox is ever fully torn down and recreated (not
// just redeployed), these IDs will change and need updating here.
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_VEYbEth4g',
      userPoolClientId: '5269d81gnu8skf49c854ho6pb5',
      identityPoolId: 'us-east-1:6883c9e9-f661-4604-a719-b95be82884d2',
      loginWith: {
        email: true,
      },
    },
  },
}
