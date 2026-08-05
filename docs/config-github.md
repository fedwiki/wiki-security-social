## GitHub

GitHub's OAuth integration only allows us to specify a single callback URL. This means that if you are running a wiki farm with multiple DNS roots, you will need to configure a separate application with GitHub for each wiki domain.

### Register an application with GitHub

0. Log into GitHub
1. Visit the Developer applications tab under OAuth applications in your Personal settings.
2. Click [Register New Application](https://github.com/settings/applications/new). The _new OAuth application_ configuration screen is displayed:

![GitHub New OAuth Application](./images/github-new-app.png)

#### Set Application name

- Enter a name related to your wiki server.

#### Set Homepage URL

- Enter the URL of a page that describes your wiki server.

#### Set Authorization callback URL

- Enter `https://example.wiki/auth/callback/github`, replacing `example.wiki` with your wiki server root domain.

#### Enable Device Flow

Leave unchecked.

Save your settings by clicking **Register application**. The new application's settings are shown:

![GitHub Application Summary](./images/github-app-summary.png)

This screen also allows you to adjust any settings, and add an logo.

- Record the `Client ID`, click on `Generate a new client secret` and record the `Client Secret` for use in configuring the wiki server.

### Configure Wiki

The wiki is configured by adding the `client ID` and `client secret` to the wiki domain part of the configuration.

```JSON
{
  "farm": true,
  "security_type": "social",
  "wikiDomains": {
    "example.wiki": {
      "github_clientID": "CLIENT ID",
      "github_clientSecret": "CLIENT SECRET"
    }
  }
}
```
