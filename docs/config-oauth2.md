## Generic OAuth 2

### Login provider set-up

Like the other login providers, we'll need a separate "OAuth2 Client"
(others call it an "app", a "product" etc.) for our Federated Wiki instance.

How to do this varies slightly for each provider.

### `config.json`

In general, you will need to specify:

- `oauth2_clientID` -- some systems generate this for you, others allow you to specify it
- `oauth2_clientSecret` -- secure key (keep this secret!)
- `oauth2_discoveryUrl` -- from your login provider's documentation

You might also need to configure which fields Federated Wiki will use for the ID, display name and user name.

- oauth2_IdField -- this will default to `sub`
- oauth2_DisplayNameField -- this will default to `preferred_username`. It is the name put in the wiki's footer.
- oauth2_UsernameField -- this will default to `preferred_username`

### Examples

```JSON
{
  "farm": true,
  "admin": {"oauth2": "UUID OF USER FROM YOUR PROVIDER"},
  "security_type": "social",
  "oauth2_clientID": "CLIENT ID",
  "oauth2_clientSecret": "CLIENT SECRET",
  "oauth2_discoveryUrl": "DISCOVERY URL"
}
```

There is also an optional parameter `auth_Prompt`. The prompt parameter in the OAuth/OIDC authorization code request dictates user interaction behavior. The standard parameters control whether the user can bypass Single Sign-On (SSO) or must explicitly log in or consent.

The specific prompt values you can use are:
*  `login`: Forces the user to re-enter their credentials on the authorization server, bypassing any existing SSO sessions.
* `consent`: Forces the authorization server to show the user a consent screen asking to grant permissions to your app, even if they've already approved it.
* `none`: Instructs the server to perform no interactive UI prompts. If the user isn't already logged in or needs to approve something, it immediately returns an error. Used primarily for silent authentication.
* `select_account`: Forces the user to choose an account if multiple are logged into the authorization server.
* `(Omissions)`: Omitting the parameter uses the authorization provider's default behavior (usually showing a login screen only if the user has no active session).
