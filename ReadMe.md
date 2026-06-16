# Wiki Security Social

This is a social authentication plugin for Federated Wiki. It is a replacement for the older PassportJS-based plugin, though support for X (twitter) has been dropped (it stopped working using PassportJS plugin some years ago).

This implementation is using the [Better Auth](https://better-auth.com/) package, with their social sign-on for Google and Github, and the Generic OAuth plugin for Keycloak.

As a wiki farm host, you have to choose which authentication provider you want to use. You will need to register an application with the required identity provider, and configure the wiki server. See, [configuring wiki-security-social](./docs/configuration.md).

**Although it is possible to configure multiple authentication providers, it is advisable to only configure a single provider. This is to avoid confusing wiki users.**

## Upgrading from wiki-security-passportjs

For those using Google or GitHub, Better Auth's social sign-on is built to use a slightly different callback URL. You **MUST** update the Authorization callback URL to use the new callback URL.

For those using generic OAuth, configuration is simplified by using OIDC Discovery.
