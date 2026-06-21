# Federated Wiki - Security Plug-in: Social (Configuration)

It is recommended that this plug-in is configured using a configuration file, rather than via the command line.

Configuration of this security plug-in is a two stage process:

1. Registering an application with the identity provider, and
2. Configuration of the wiki software using information returned in step 1.

This plug-in comes with support for using GitHub, Google, and Keycloak (generic OAuth). Although the configuration process is broadly the same for each of these, there are some slight differences.

**Although it is possible to configure multiple authentication providers, it is advisable to only configure a single provider. This is to avoid confusing wiki users.**

As a wiki server owner you need to pick an identity provider, depending on which you choose, see:

- [GitHub](./config-github.md)
- [Google](./config-google.md)
- [Generic OAuth (e.g. Keycloak)](./config-oauth2.md)

With all of the providers above you are also able to configure sites on your farm to be [Login to View](http://ward.asia.wiki.org/login-to-view.html). This means only specified visitors are allowed to view the site's content, rather than it being public on the web. The following page explains how to configure the login-to-view system:

- [Configure Login to View](./config-login-to-view.md)
