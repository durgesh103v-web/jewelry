const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen'
]

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertBelowHundred(num: number): string {
  if (num < 20) return ones[num]
  return `${tens[Math.floor(num / 10)]} ${ones[num % 10]}`.trim()
}

function convertBelowThousand(num: number): string {
  const hundred = Math.floor(num / 100)
  const rest = num % 100

  if (hundred && rest) {
    return `${ones[hundred]} Hundred ${convertBelowHundred(rest)}`
  }

  if (hundred) {
    return `${ones[hundred]} Hundred`
  }

  return convertBelowHundred(rest)
}

export function amountInWords(amount: number): string {
  let num = Math.floor(Number(amount || 0))

  if (num === 0) {
    return 'Zero Rupees Only'
  }

  const crore = Math.floor(num / 10000000)
  num %= 10000000

  const lakh = Math.floor(num / 100000)
  num %= 100000

  const thousand = Math.floor(num / 1000)
  num %= 1000

  const parts: string[] = []

  if (crore) parts.push(`${convertBelowThousand(crore)} Crore`)
  if (lakh) parts.push(`${convertBelowThousand(lakh)} Lakh`)
  if (thousand) parts.push(`${convertBelowThousand(thousand)} Thousand`)
  if (num) parts.push(convertBelowThousand(num))

  return `${parts.join(' ')} Rupees Only`
}
