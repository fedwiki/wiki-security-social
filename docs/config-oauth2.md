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
- oauth2_DisplayNameField -- this will default to `display_name`
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
