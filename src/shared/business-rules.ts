export const BusinessRules = {
  /**
   * Validates whether the request is within banking hours.
   */
  isServiceOpen(): boolean {
    const today = new Date()
    today.setHours(today.getHours() - 6) // CDMX Timezone Adjustment

    // Weekends, Hours (9am-8pm), and Holidays Hardcoded
    if (
      today.getDay() === 0 // Domingo
      || today.getDay() >= 6 // Sábado
      || today.getHours() >= 20
      || today.getHours() < 9
      || (today.getDate() === 1 && today.getMonth() === 0) // 1 Ene
      || (today.getDate() === 2 && today.getMonth() === 1) // 5 Feb (Ajustado)
      || (today.getDate() === 16 && today.getMonth() === 2) // 18 Mar (Ajustado)
      || (today.getDate() === 2 && today.getMonth() === 3) // 2 Abr (Ajustado)
      || (today.getDate() === 3 && today.getMonth() === 3) // 3 Abr (Ajustado)
      || (today.getDate() === 1 && today.getMonth() === 4) // 1 May
      || (today.getDate() === 16 && today.getMonth() === 8) // 16 Sep
      || (today.getDate() === 2 && today.getMonth() === 10) // 2 Nov
      || (today.getDate() === 16 && today.getMonth() === 10) // 20 Nov (Ajustado)
      || (today.getDate() === 12 && today.getMonth() === 11) // 12 Dic
      || (today.getDate() === 25 && today.getMonth() === 11) // 25 Dic
    ) {
      return false
    }
    return true
  },
}
