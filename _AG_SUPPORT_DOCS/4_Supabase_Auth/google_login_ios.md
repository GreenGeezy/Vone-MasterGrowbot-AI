Source: Google Login with Supabase (iOS)

Sign in with Google (iOS)
Supabase Auth supports Google login on iOS (and other platforms). To set it up:

Prerequisites: You must configure a Google API project:

In the Google Cloud Platform, create/select a project.
In OAuth consent screen, set up your app’s name and scopes. Ensure you have a valid support email and domain.
In Credentials, create an OAuth Client ID for iOS. Enter your app’s bundle identifier.
On the Google side, configure:
Authorized Redirect URI to supabase://auth/v1/callback (if required by your setup).
Scopes: Supabase requires the openid scope at minimum (add manually if needed).
Supabase Setup:
In your Supabase project’s Auth → Settings → External OAuth Providers, enable Google. Enter the Client ID and Client Secret from the Google Console.

Implementation:
In your iOS app code, call Supabase’s sign-in method with the Google provider, e.g. using the Supabase iOS SDK’s signInWithProvider(.google) which will open a web view for Google login. After the user authenticates, Supabase returns a session.

(This file contains the setup steps and requirements for Google social login in a Supabase iOS app, as per Supabase’s documentation.)
