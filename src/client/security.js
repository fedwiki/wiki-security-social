import { createAuthClient } from 'better-auth/client'

const authClient = createAuthClient({
  baseURL: window.location.origin + '/auth',
})

let settings = {}

const handleAuthentication = async () => {
  const features = 'width=700,height=375,resizable=1,scrollbars=1'
  const expectOrigin = new URL(settings.dialogURL).origin

  const openDialog = () => {
    return new Promise((resolve, reject) => {
      const popup = window.open(settings.dialogURL, '_blank', features)

      if (!popup) return reject(new Error('Popup blocked'))

      const handleMessage = event => {
        if (event.origin !== expectOrigin) {
          console.warn('Received message from untrusted origin:', event.origin)
          return
        }

        if (event.data?.type === 'AUTHENTICATION_RESPONSE') {
          window.removeEventListener('message', handleMessage)
          popup.close()
          resolve(event.data.payload)
        }
      }

      window.addEventListener('message', handleMessage)

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          window.removeEventListener('message', handleMessage)
          reject(new Error('User closed the dialog'))
        }
      }, 500)
    })
  }

  try {
    const result = await openDialog()
    window.isAuthenticated = true
    if (!isClaimed) {
      console.log('*** wiki not claimed yet.')
      // add code to claim...
    } else {
      console.log('*** wiki already claimed')
      location.reload()
      // if (wiki.lineup.bestTitle() == 'Login Required') {
      //   location.reload()
      // } else {
      //   update_footer(ownerName, true)
      // }
    }
  } catch (err) {
    console.log(err)
  }
}

const setup = user => {
  // add style if not already added
  if (!$("link[href='/security/style.css']").length) {
    $('<link rel="stylesheet" href="/security/style.css">').appendTo('head')
  }

  // listen for signon happening elsewhere
  cookieStore.addEventListener('change', ({ changed }) => {
    for (const { name, value } of changed) {
      if (name === 'state') {
        switch (value) {
          case 'loggedIn':
            window.isAuthenticated = true
            break
          case 'loggedOut':
            window.isAuthenticated = false
            break
          default:
            console.log('--- Unexpect state cookie value', value)
        }
        fetch('/auth/client-settings.json', { method: 'GET', cache: 'no-cache', mode: 'same-origin' })
          .then(response => response.json())
          .then(json => {
            // console.log('client-settings', json)
            window.isOwner = json.isOwner
            update_footer(ownerName, isAuthenticated)
          })
          .catch(error => {
            console.log('Unable to fetch client settings: ', error)
          })
      }
    }
  })

  // load client setting from server
  fetch('/auth/client-settings.json', { method: 'GET', cache: 'no-cache', mode: 'same-origin' })
    .then(response => response.json())
    .then(json => {
      // console.log('client-settings', json)
      window.isOwner = json.isOwner
      settings = json
      const dialogHost = settings.wikiHost ? settings.wikiHost : window.location.host
      settings.cookieDomain = dialogHost
      const dialogProtocol = settings.useHttps ? 'https:' : window.location.protocol
      settings.dialogURL = ''.concat(dialogProtocol, '//', dialogHost, '/auth/loginDialog')
      update_footer(ownerName, isAuthenticated)
    })
    .catch(error => {
      console.log('Unable to fetch client settings: ', error)
    })
}

const claim_wiki = () => {
  if (!isClaimed) {
    fetch('/auth/claim-wiki', { method: 'GET', cache: 'no-cache', mode: 'same-origin', credentials: 'include' }).then(
      response => {
        if (response.ok) {
          response.json().then(json => {
            if (wiki.lineup.bestTitle() == 'Login Required') {
              location.reload()
            } else {
              ownerName = json.ownerName
              window.isClaimed = true
              window.isOwner = true
              update_footer(ownerName, true)
            }
          })
        } else {
          console.log('Attempt to claim site failed', response)
        }
      },
    )
  }
}

const update_footer = (ownerName, isAuthenticated) => {
  console.log('*** update_footer', { ownerName, isAuthenticated, settings })
  // console.trace() // how did we get here

  if (ownerName) {
    $('footer > #site-owner').html(
      `Site Owned by: <span id='site-owner' style='text-transform:capitalize;'>${ownerName}</span>`,
    )
  }

  $('footer > #security').empty()

  if (isAuthenticated) {
    console.log('*** we think we have authenticated!!!')
    const logoutLink = {}
    if (isOwner) {
      logoutLink.title = 'Sign-out'
      logoutLink.iconClass = ''
    } else {
      logoutLink.title = 'Not Owner : Sign-out'
      logoutLink.iconClass = 'notOwner'
    }
    $('footer > #security').append(
      `<a href='#' id='logout' class='footer-item' title='${logoutLink.title}'><img  src='/security/lock_open.svg' height=15 width=15 class='${logoutLink.iconClass}'></a>`,
    )
    $('footer > #security > #logout').on('click', async e => {
      e.preventDefault()
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // do we need to send message to server??? don't think so...
            // set state cookie so it can be reflected in any other windows for this wiki domain.
            document.cookie = `state=loggedOut ;domain=.${settings.cookieDomain} ;path=/; max-age=60 ;sameSite=Strict;`
            location.reload()
          },
        },
      })
    })
    if (!isClaimed) {
      $('footer > #security').append(
        `<a href='#' id='claim' class='foot-item' title='Claim this Wiki'><img src='/security/key.svg' height=15 width=15></a>`,
      )
      $('footer > #security > #claim').on('click', e => {
        e.preventDefault()
        claim_wiki()
      })
    }
  } else {
    let signonTitle
    if (!isClaimed) {
      signonTitle = 'Claim this Wiki'
    } else {
      signonTitle = 'Wiki Owner Sign-on'
    }
    $('footer > #security').append(
      `<a href='#' id='show-security-dialog' class='footer-item' title='${signonTitle}'><img src='/security/lock.svg' height=15 width=15></a>`,
    )
    $('footer > #security > #show-security-dialog').on('click', e => {
      e.preventDefault()
      document.cookie = `wikiName=${window.location.host} ;domain=${settings.cookieDomain} ;path=/ ;max-age=300 ;sameSite=Strict;`
      handleAuthentication()
    })
  }
}

window.plugins.security = { setup, update_footer }
