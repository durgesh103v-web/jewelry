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

  if (lowerMessage.includes('account already exists')) {
    return 'This account already exists. Please use another account name.'
  }

  if (lowerMessage.includes('another account with this name already exists')) {
    return 'Another account with this name already exists.'
  }

  if (lowerMessage.includes('account name is required')) {
    return 'Please enter account name.'
  }

  if (lowerMessage.includes('account group is required')) {
    return 'Please select account group.'
  }

  if (lowerMessage.includes('account not found')) {
    return 'Account not found. Please refresh and try again.'
  }
  if (lowerMessage.includes('item group already exists')) {
    return 'This item group already exists for selected metal type.'
  }

  if (lowerMessage.includes('another item group with this name already exists')) {
    return 'Another item group with this name already exists for selected metal type.'
  }

  if (lowerMessage.includes('item group name is required')) {
    return 'Please enter item group name.'
  }

  if (lowerMessage.includes('item group not found')) {
    return 'Item group not found. Please refresh and try again.'
  }
  if (lowerMessage.includes('item stamp already exists')) {
    return 'This item stamp already exists for selected metal type.'
  }

  if (lowerMessage.includes('another item stamp with this name already exists')) {
    return 'Another item stamp with this name already exists for selected metal type.'
  }

  if (lowerMessage.includes('item stamp name is required')) {
    return 'Please enter item stamp name.'
  }

  if (lowerMessage.includes('item stamp not found')) {
    return 'Item stamp not found. Please refresh and try again.'
  }
  if (lowerMessage.includes('item design already exists')) {
    return 'This item design already exists for selected metal type.'
  }

  if (lowerMessage.includes('another item design with this name already exists')) {
    return 'Another item design with this name already exists for selected metal type.'
  }

  if (lowerMessage.includes('item design name is required')) {
    return 'Please enter item design name.'
  }

  if (lowerMessage.includes('item design not found')) {
    return 'Item design not found. Please refresh and try again.'
  }
  if (lowerMessage.includes('item already exists')) {
    return 'This item already exists for selected metal type.'
  }

  if (lowerMessage.includes('another item with this name already exists')) {
    return 'Another item with this name already exists for selected metal type.'
  }

  if (lowerMessage.includes('item name is required')) {
    return 'Please enter item name.'
  }

  if (lowerMessage.includes('item group is required')) {
    return 'Please select item group.'
  }

  if (lowerMessage.includes('item not found')) {
    return 'Item not found. Please refresh and try again.'
  }
  if (lowerMessage.includes('opening stock not found')) {
    return 'Opening stock not found. Please refresh and try again.'
  }

  if (lowerMessage.includes('sale not found')) {
    return 'Sale bill not found. Please refresh and try again.'
  }

  if (lowerMessage.includes('item is required')) {
    return 'Please select item.'
  }

  return message
}
