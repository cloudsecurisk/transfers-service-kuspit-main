export interface SplitPhone {
  lada: number
  numero: string
}

export const splitMexicanPhoneNumber = (rawPhone: string): SplitPhone => {
  // 1. Cleaning
  let clean = rawPhone.replace(/\D/g, '')

  // If it comes with the 52, we delete it if it has 12 or 13 digits
  if (clean.startsWith('52') && clean.length > 10) {
    clean = clean.substring(2)
  }

  // Basic validation: Must have 10 digits
  if (clean.length !== 10) {
    // Fallback option
    // If it doesn't have 10, we assume Lada 0 to avoid breaking the flow.
    return { lada: 0, numero: clean }
  }

  // 2. Principal Cities Rule (2 digits)
  const TWO_DIGIT_LADAS = ['33', '55', '81']
  const firstTwo = clean.substring(0, 2)

  if (TWO_DIGIT_LADAS.includes(firstTwo)) {
    return {
      lada: parseInt(firstTwo, 10),
      numero: clean.substring(2),
    }
  }

  // 3. General Rule (3 digits)
  return {
    lada: parseInt(clean.substring(0, 3), 10),
    numero: clean.substring(3),
  }
}
