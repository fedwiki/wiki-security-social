## Google

Google's OAuth integration allows us to specify multiple callback URLs, so we will only need to do this once for each wiki server.

### Register an application with Google

To use Google as a social provider, you need to get your Google credentials. You can get them by creating a new project in the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)

See Google Cloud Platform Console Help - [Google Auth Patform > Manage OAuth Clients](https://support.google.com/cloud/answer/15549257) for how to create Client ID and Secret.

On _Client ID for Web application_

- **Authorized JavaScript Origins**: `https://example.wiki`
- **Authorized redirect URI**: `https://example.wiki/auth/callback/google`

Replacing `example.wiki` with your wiki server root domain. If your wiki server is supporting multiple wiki domains, you can enter them as well.

Be sure to take a note of the Client ID and Client Secret.

### Configure Wiki

The wiki is configured by adding the `client ID` and `client secret` to the configuration. They need not be added inside the `wikiDomains` definition, as the OAuth can have multiple callbacks defined, we still need the domain definition so that the wiki security plugin can understand what is required.

```JSON
{
  "farm": true,
  "security_type": "social",
  "google_clientID": "CLIENT ID",
  "google_clientSecret": "CLIENT SECRET",
  "wikiDomains": {
    "example.wiki": {}
  }
}
```

There is also an optional parameter `auth_Prompt`. Allowed values are `consent` (show the consent screen) and `select_account` (ask the user to pick an account). If `auth_Prompt` is omitted, the plugin sends `select_account`.
