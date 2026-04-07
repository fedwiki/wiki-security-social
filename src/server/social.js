import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { betterAuth, socialProviders } from 'better-auth'
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node'

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
    useHttps: argv.security_useHttps ? true : false,
    callbackProtocol: argv.security_useHttps ? 'https:' : url.parse(argv.url).protocol,
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

  security.authenticate_session = () => {
    // console.log('*** authenticate_session')
  }

  security.retrieveOwner = cb => {
    fs.access(thisWiki.idFile, fs.constants.F_OK, err => {
      if (!err) {
        fs.readFile(thisWiki.idFile, (err, data) => {
          if (err) return cb(err)
          thisWiki.owner = JSON.parse(data)
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
        fs.writeFile(idFile, JSON.stringify(id), err => {
          if (err) return cb(err)
          // console.log(`Claiming wiki ${thisWiki.wikiName} for ${id.name}`)
          thisWiki.owner = id
          thisWiki.ownerName = owner.name
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
      console.log('*** isAuth - unclaimed')
      return true
    } else {
      if (req.user) {
        // we have a session
        const idProvider = Object.keys(req.user.social)
        if (thisWiki.owner[idProvider].id.toString() === req.user.social[idProvider].id.toString()) {
          return true
        } else {
          return false
        }
      } else {
        return false
      }
    }
  })

  security.isAdmin = () => {}

  security.defineRoutes = (app, cors, updateOwner) => {
    const authSpec = {
      baseURL: `${thisWiki.callbackProtocol}//${thisWiki.callbackHost}/auth`,
      socialProviders: {},
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
        useSecureCookies: true,
      },
      trustedOrigins: [`${thisWiki.callbackProtocol}//*.${thisWiki.callbackHost}`],
    }

    // Github
    if (['github_clientID', 'github_clientSecret'].every(key => key in argv)) {
      // console.log('GITHUB')
      authSpec.socialProviders.github = {
        clientId: argv.github_clientID,
        clientSecret: argv.github_clientSecret,
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

    // add other possible auth providers here.

    // configure authenticaiton methods
    console.log('authSpec', authSpec)
    auth = betterAuth(authSpec)

    app.use(async (req, res, next) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      })
      // console.log('*** app use', session)
      if (session) {
        // console.log('*** app.use', session.user)
        req.user = session.user
      } else {
        // console.log('*** app.use - no user')
        req.user = ''
      }
      next()
    })

    app.get('/auth/client-settings.json', (req, res) => {
      console.log('*** client-settings', thisWiki, isAuthorized(req))
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
      // console.log('*** loginDialog - cookies', cookies)
      const schemeButtons = []

      // hard code github for now.
      schemeButtons.push({
        button: `<a href='#' onclick='signIn("github")' class='scheme-button github-button'><span>Github</span></a>`,
      })

      const info = {
        wikiName: cookies['wikiName'],
        wikiHostName: thisWiki.wikiHost ? 'part of ' + req.hostname + ' wiki farm' : 'a federated wiki site',
        title: 'Federated Wiki: Site Owner Sign-on',
        loginText: 'Sign in to',
        schemes: schemeButtons,
      }
      // console.log('*** loginDialog', info)
      res.render(
        path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'views', 'securityDialog.html'),
        info,
      )
    })

    app.get('/auth/loginDone', async (req, res) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      })
      // console.log('*+* BA Session', session)

      const cookies = req.cookies
      // console.log('*** cookies', cookies)
      const info = {
        wikiName: cookies['wikiName'],
        wikiHostName: thisWiki.wikiHost ? `part of ${req.hostname} wiki farm` : 'a federated wiki site',
        title: thisWiki.owner ? 'Wiki Site Owner Sign-on' : 'Sign-on to claim Wiki site',
        owner: getOwner(),
        authMessage: "You are now logged in. If this window hasn't closed, you can close it.",
      }
      // console.log('***loginDone', info)
      res.render(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'views', 'done.html'), info)
    })

    app.get('/logout', async (req, res) => {
      console.log('Logout...')
      req.session.reset()
      res.send('OK')
    })

    app.all('/auth/*splat', toNodeHandler(auth))
  }
  return security
}
