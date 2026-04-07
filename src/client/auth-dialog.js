import { createAuthClient } from 'better-auth/client'

const authClient = createAuthClient({
  baseURL: window.location.origin + '/auth',
})

const signIn = async provider => {
  const { data, error } = await authClient.signIn.social({
    provider: provider,
    callbackURL: '/auth/loginDone',
    errorCallbackURL: '/auth/loginDialog',
  })
  // console.log('+++ DATA', data)
  // console.log('*** ERROR', error)
}

// really add listener, but a short term hack to get things going.
window.signIn = signIn
