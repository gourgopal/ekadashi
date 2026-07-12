'use client'

import { useEffect } from 'react'

export default function CalendarScroll() {
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const cards = document.querySelectorAll<HTMLElement>('[id^="ekadashi-"]')
    let target: HTMLElement | null = null

    for (const card of cards) {
      const date = card.id.replace('ekadashi-', '')
      if (date >= today) {
        target = card
        break
      }
    }

    if (target) {
      setTimeout(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.style.setProperty('transition', 'box-shadow 0.6s ease')
        target?.style.setProperty('box-shadow', '0 0 30px rgba(244,196,48,0.4)')
        setTimeout(() => {
          target?.style.setProperty('box-shadow', '')
        }, 2000)
      }, 300)
    }
  }, [])

  return null
}
