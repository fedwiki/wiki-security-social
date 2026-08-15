import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { betterAuth, socialProviders } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node'
import { create } from 'express-handlebars'

// Private stuff

console.log('*** security social starting')

export default (log, loga, argv) => {
  let auth

  const thisWiki = {
    owner: '',
    ownerName: '',
    wikiName: argv.url,
    wikiHost: argv.wiki_domain ? argv.wiki_domain : null,
    admin: argv.admin,
    statusDir: argv.status,
    idFile: argv.id,
    useHttps: argv.security_useHttps ?? true,
    callbackProtocol: (argv.security_useHttps ?? true) ? 'https:' : url.parse(argv.url).protocol,
    providers: [],
  }

  thisWiki.callbackHost = thisWiki.wikiHost
    ? url.parse(argv.url).port
      ? `${thisWiki.wikiHost}:${url.parse(argv.url).port}`
      : thisWiki.wikiHost
    : url.parse(argv.url).host

  // Public stuff
  const security = {}

  // called by wiki-server

  security.retrieveOwner = cb => {
    fs.access(thisWiki.idFile, fs.constants.F_OK, err => {
      if (!err) {
        fs.readFile(thisWiki.idFile, (err, data) => {
          if (err) return cb(err)
          try {
            thisWiki.owner = JSON.parse(data)
          } catch (error) {
            console.log(`*** OWNER FILE PROBLEM
*** Owner File: ${thisWiki.idFile}
*** Error: ${error.message}`)
            thisWiki.owner = { name: 'unparsable' }
          }
          thisWiki.ownerName = thisWiki.owner.name
          cb()
        })
      } else {
        thisWiki.owner = ''
        cb()
      }
    })
  }

  const getOwner = (security.getOwner = () => {
    const ownerName = thisWiki.owner.name || ''
    return ownerName
  })

  const setOwner = (security.setOwner = (id, cb) => {
    fs.access(thisWiki.idFile, fs.constants.F_OK, err => {
      if (err) {
        fs.writeFile(thisWiki.idFile, JSON.stringify(id), err => {
          if (err) return cb(err)
          console.log(`Claiming wiki ${thisWiki.wikiName} for ${id.name}`)
          thisWiki.owner = id
          thisWiki.ownerName = id.name
          cb()
        })
      } else {
        cb('Already Claimed')
      }
    })
  })

  security.getUser = req => {
    const user = req.user
    return user
  }

  const isAuthorized = (security.isAuthorized = req => {
    if (thisWiki.owner === '') {
      return true
    } else {
      if (req.user) {
        // we have a session - currently there should only be one...
        const idProvider = Object.keys(req.user.social)
        if (idProvider.some(key => thisWiki.owner.hasOwnProperty(key))) {
          if (thisWiki.owner[idProvider].id.toString() === req.user.social[idProvider].id.toString()) {
            return true
          } else {
            return false
          }
        } else {
          return false
        }
      } else {
        return false
      }
    }
  })

  security.isAdmin = req => {
    if (typeof thisWiki.admin === 'undefined') {
      return false
    }
    try {
      if (!req.user) {
        return false
      }
    } catch (e) {
      return false
    }
    const idProvider = Object.keys(req.user.social)[0]
    if (thisWiki.admin[idProvider] === undefined) {
      console.log('admin not defined for', idProvider)
      return false
    }
    const adminProviders = ['github', 'google', 'oauth2']
    if (adminProviders.includes(idProvider)) {
      return thisWiki.admin[idProvider].toString() === req.user.social[idProvider].id.toString()
    }
    return false
  }

  security.defineRoutes = (app, cors, updateOwner) => {
    // extend views...
    const hbs = create({
      extname: '.html',
      layoutsDir: path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'views'),
      defaultLayout: 'securityDialog',
    })

    const authSpec = {
      baseURL: `${thisWiki.callbackProtocol}//${thisWiki.callbackHost}/auth`,
      basePath: '/auth',
      socialProviders: {},
      plugins: [],
      secret: argv.cookieSecret,
      session: {
        strategy: 'compact',
        expiresIn: argv.session_duration * 24 * 60 * 60,
        updateAge: 60 * 60 * 24,
        cookieCache: {
          enabled: true,
          maxAge: argv.session_duration * 24 * 60 * 60,
        },
      },
      cookie: {
        maxAge: argv.session_duration * 24 * 60 * 60,
      },
      user: {
        additionalFields: {
          social: {
            type: 'object',
            returned: true,
          },
        },
      },
      advanced: {
        crossSubDomainCookies: {
          enabled: true,
        },
        cookiePrefix: 'fedwiki',
        // Secure cookies require HTTPS; derive from security_useHttps so HTTP can hold a session.
        useSecureCookies: thisWiki.useHttps,
      },
      trustedOrigins: [`${thisWiki.callbackProtocol}//*.${thisWiki.callbackHost}`],
    }

    // Github - uses social sign-on
    if (['github_clientID', 'github_clientSecret'].every(key => key in argv)) {
      // if github ever widen prompt support this will need updating
      if (argv.auth_Prompt) {
        if (!argv.auth_Prompt === 'select_account') {
          argv.auth_Prompt = null
        }
      }
      authSpec.socialProviders.github = {
        clientId: argv.github_clientID,
        clientSecret: argv.github_clientSecret,
        ...(argv.auth_Prompt ? { prompt: argv.auth_Prompt } : {}),
        mapProfileToUser: async profile => {
          return {
            social: {
              github: {
                username: profile.login,
                id: profile.id,
              },
            },
          }
        },
      }
    }

    // Google - uses social sign-on
    if (['google_clientID', 'google_clientSecret'].every(key => key in argv)) {
      // if google ever widen prompt support this will need updating
      if (argv.auth_Prompt) {
        if (!['consent', 'select_account'].includes(argv.auth_Prompt)) {
          argv.auth_Prompt = null
        }
      }
      authSpec.socialProviders.google = {
        clientId: argv.google_clientID,
        clientSecret: argv.google_clientSecret,
        ...(argv.auth_Prompt ? { prompt: argv.auth_Prompt } : {}),
        mapProfileToUser: async profile => {
          return {
            social: {
              google: {
                username: profile.name,
                id: profile.sub,
              },
            },
          }
        },
      }
    }

    // oauth2 - uses the Generic OAuth plugin, using discovery url
    if (['oauth2_clientID', 'oauth2_clientSecret', 'oauth2_discoveryUrl'].every(key => key in argv)) {
      if (argv.auth_Prompt) {
        if (!['login', 'consent', 'none', 'select_account'].includes(argv.auth_Prompt)) {
          argv.auth_Prompt = null
        }
      }
      authSpec.plugins.push(
        genericOAuth({
          config: [
            {
              providerId: 'oauth2',
              clientId: argv.oauth2_clientID,
              clientSecret: argv.oauth2_clientSecret,
              ...(argv.auth_Prompt ? { prompt: argv.auth_Prompt } : {}),
              discoveryUrl: argv.oauth2_discoveryUrl,
              scopes: ['openid', 'profile', 'email'],
              mapProfileToUser: async profile => {
                console.log('oauth2', profile)
                return {
                  name: profile[argv.oauth2_DisplayNameField] || profile.preferred_username,
                  social: {
                    oauth2: {
                      id: profile[argv.oauth2_IdField] || profile.sub, // This is the UUID from Keycloak
                      username: profile[argv.oauth2_UsernameField] || profile.preferred_username,
                    },
                  },
                }
              },
            },
          ],
        }),
      )
    }

    // add other possible auth providers here.

    // configure authenticaiton methods
    auth = betterAuth(authSpec)

    app.use(async (req, res, next) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      })
      if (session) {
        req.user = session.user
      } else {
        req.user = ''
      }
      next()
    })

    app.get('/auth/client-settings.json', (req, res) => {
      const settings = {
        useHttps: thisWiki.useHttps,
      }
      if (thisWiki.wikiHost) {
        settings.wikiHost = thisWiki.wikiHost
      }
      if (isAuthorized(req) && thisWiki.owner != '') {
        settings.isOwner = true
      } else {
        settings.isOwner = false
      }
      res.json(settings)
    })

    app.get('/auth/loginDialog', (req, res) => {
      const cookies = req.cookies
      const schemeButtons = []

      // Github
      if (authSpec.socialProviders.github) {
        schemeButtons.push({
          button: `<a href='#' onclick='window.resizeBy(0,+500); signIn("github")' class='scheme-button github-button'><span>Github</span></a>`,
        })
      }
      // Google
      if (authSpec.socialProviders.google) {
        schemeButtons.push({
          button: `<a href='#' onclick='window.resizeBy(0,+300); signIn("google")' class='scheme-button google-button'><span>Google</span></a>`,
        })
      }

      // OAuth2
      if (authSpec.plugins.some(p => p.id === 'generic-oauth' && p.options.config[0].providerId === 'oauth2')) {
        schemeButtons.push({
          button: `<a href='#' onclick='window.resizeBy(0,+300); signIn("oauth2")'  class='scheme-button'><span>OAuth2</span></a>`,
        })
      }

      const info = {
        wikiName: cookies['wikiName'],
        wikiHostName: thisWiki.wikiHost ? 'part of ' + req.hostname + ' wiki farm' : 'a federated wiki site',
        title: 'Federated Wiki: Site Owner Sign-on',
        loginText: 'Sign in to',
        schemes: schemeButtons,
      }

      hbs
        .render(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'views', 'securityDialog.html'), info)
        .then(rendered => res.send(rendered))
    })

    app.get('/auth/loginDone', async (req, res) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      })

      const cookies = req.cookies
      const info = {
        wikiName: cookies['wikiName'],
        wikiHostName: thisWiki.wikiHost ? `part of ${req.hostname} wiki farm` : 'a federated wiki site',
        title: thisWiki.owner ? 'Wiki Site Owner Sign-on' : 'Sign-on to claim Wiki site',
        owner: getOwner(),
        authMessage: "You are now logged in. If this window hasn't closed, you can close it.",
      }
      hbs
        .render(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'views', 'done.html'), info)
        .then(rendered => res.send(rendered))
    })

    // if configured, enforce restricted access to json
    // see http://ward.asia.wiki.org/login-to-view.html

    if (argv.restricted != null) {
      const allowedToView = req => {
        if (argv.allowed_domains != null) {
          try {
            const allowed_domains = argv.allowed_domains
            var emails = req.user.social.google.emails || [{ value: req.user.email }]
            for (const entry of emails) {
              const have = entry.value.split('@')[1]
              for (const want of allowed_domains) {
                if (want === have) return true
              }
            }
          } catch (error) {
            if (emails != null) {
              console.log(
                "argv.allowed_domains exists, but there was an error. Make sure it's value is an array in your config.",
              )
            }
          }
        }
        if (argv.allowed_ids != null) {
          try {
            const allowed_ids = argv.allowed_ids
            var idProvider = Object.keys(req.user.social)[0]
            switch (idProvider) {
              case 'github': case 'oauth2':
                var id = req.user.social[idProvider].id
                if (allowed_ids.length === 1 && allowed_ids[0] === '*') return true
                for (const want of allowed_ids) {
                  if (want === id) return true
                }
            }
          } catch (error) {
            if (idProvider != null) {
              console.log(
                "argv.allowed_ids exists, but there was an error. Make sure it's value is an array in your config.",
              )
            }
          }
        }
        return false
      }

      app.all('/*splat', (req, res, next) => {
        // don't protect site flag,
        if (req.url === '/favicon.png') return next()
        if (!/\.(json|html)$/.test(req.url)) return next()

        // prepare to examine remote server's forwarded session
        res.header('Access-Control-Allow-Origin', req.get('Origin') || '*')
        res.header('Access-Control-Allow-Credentials', 'true')
        // protect unclaimed by adding "add owner isnt ''" - maybe via parameter
        if ((isAuthorized(req) && thisWiki.owner !== '') || allowedToView(req)) return next()
        var m; if ((m = req.url.match(/\/(.*)\.html$/))) return res.redirect(`/view/${m[1]}`)
        if (req.url === '/system/sitemap.json') return res.json(['Login Required'])

        // not happy, explain why these pages can't be viewed
        const problem =
          'This is a restricted wiki requires users to login to view pages. You do not have to be the site owner but you do need to login with a participating email address.'
        const details = `[${argv.details || 'http://ward.asia.wiki.org/login-to-view.html'} details]`
        res.status(200).json({
          title: 'Login Required',
          story: [
            {
              type: 'paragraph',
              id: '55d44b367ed64875',
              text: `${problem} ${details}`,
            },
          ],
        })
      })
    }

    app.get('/auth/claim-wiki', (req, res) => {
      if (thisWiki.owner) {
        console.log('Claim Request Ignored: Wiki already has owner - ', thisWiki.wikiName)
        res.sendStatus(403)
      } else {
        const user = req.user
        console.log(user)
        const id = Object.assign(
          {
            name: user.name,
          },
          user.social,
        )
        setOwner(id, err => {
          if (err) {
            console.log('Failed to claim wiki ', req.hostname, ' for ', id)
            res.sendStatus(500)
          }
          updateOwner(getOwner())
          res.json({ ownerName: id.name })
        })
      }
    })

    app.get('/logout', async (req, res) => {
      req.session.reset()
      res.send('OK')
    })

    app.all('/auth/*splat', async (req, res) => {
      // the earlier app.user() will have consumed the body,
      // so we will need to pass it to the handler from the request.
      if (req.body && req.body.provider) {
        req.body.providerId = req.body.provider
      }
      // Pass the body EXPLICITLY to the handler
      return (
        await toNodeHandler(auth)(req, res),
        {
          body: req.body,
        }
      )
    })
  }
  return security
}
