import { createAuthClient } from 'better-auth/client'
import { genericOAuthClient } from 'better-auth/client/plugins'

const signIn = async provider => {
  switch (provider) {
    case 'oauth2': {
      const authClient = createAuthClient({
        baseURL: window.location.origin,
        basePath: '/auth',
        plugins: [genericOAuthClient()],
      })
      const { data, error } = await authClient.signIn.oauth2({
        providerId: provider,
        callbackURL: '/auth/loginDone',
        errorCallbackURL: '/auth/loginDialog',
      })
      // console.log('+++ DATA', data)
      // console.log('*** ERROR', error)
      break
    }
    case 'github':
    case 'google': {
      const authClient = createAuthClient({
        baseURL: window.location.origin + '/auth',
      })
      const { data, error } = await authClient.signIn.social({
        provider: provider,
        callbackURL: '/auth/loginDone',
        errorCallbackURL: '/auth/loginDialog',
      })
      // console.log('+++ DATA', data)
      // console.log('*** ERROR', error)
      break
    }
    default:
      console.log(`Provider ${provider} not recognised.`)
  }
}

// really add listener, but a short term hack to get things going.
window.signIn = signIn
