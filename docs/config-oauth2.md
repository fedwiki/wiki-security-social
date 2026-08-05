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
- oauth2_DisplayNameField -- this will default to `preferred_username`, this appears in the wiki's footer
- oauth2_UsernameField -- this will default to `preferred_username`

### Examples

```JSON
{
  "farm": true,
  "admin": {"oauth2": "ID VALUE FROM OWNER.JSON FILE OF ADMIN"},
  "security_type": "social",
  "oauth2_clientID": "CLIENT ID",
  "oauth2_clientSecret": "CLIENT SECRET",
  "oauth2_discoveryUrl": "DISCOVERY URL"
}
```

There is also an optional parameter `auth_Prompt`. It sets the OAuth/OIDC `prompt` on the authorization request:

- `login`: Forces the user to re-enter credentials, bypassing any existing SSO session.
- `consent`: Forces a consent screen even if the app was already approved.
- `none`: No interactive UI; if the user is not already signed in (or must approve something), the IdP returns an error.
- `select_account`: Forces an account chooser when multiple accounts are signed in.

If `auth_Prompt` is omitted, the plugin sends `login`.
