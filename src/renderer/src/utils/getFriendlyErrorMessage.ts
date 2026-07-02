export function getFriendlyErrorMessage(error: unknown): string {
  let message = 'Something went wrong. Please try again.'

  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  }

  message = message.replace(/Error invoking remote method '.*?': Error:\s*/i, '')
  message = message.replace(/^Error:\s*/i, '')

  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('account group already exists')) {
    return 'This account group already exists. Please use another group name.'
  }

  if (lowerMessage.includes('another account group with this name already exists')) {
    return 'Another account group with this name already exists.'
  }

  if (lowerMessage.includes('group name is required')) {
    return 'Please enter group name.'
  }

  if (lowerMessage.includes('account group not found')) {
    return 'Account group not found. Please refresh and try again.'
  }

  return message
}
