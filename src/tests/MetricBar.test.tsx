// Tests for the MetricBar component.
// MetricBar renders a horizontal progress bar with a percentage label.
//
// From ARCHITECTURE.md:
//   MetricBar props: { value: number, max: number }
//   Fill width = (value / max) * 100%
//
// Acceptance criteria covered:
//   AC-CPU-2 / AC-MEM-4: values displayed with correct formatting
//   AC-GENERAL-5: component renders without crashing on valid props

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MetricBar from '../components/MetricBar/MetricBar'

describe('MetricBar', () => {
  it('renders without crashing', () => {
    // AC-GENERAL-5: component must render without errors.
    const { container } = render(<MetricBar value={50} max={100} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('shows correct percentage text', () => {
    // AC-CPU-2: percentage is derived from value/max.
    render(<MetricBar value={47} max={100} />)
    expect(screen.getByText('47%')).toBeInTheDocument()
  })

  it('bar fill width matches the percentage prop', () => {
    // The inner fill element width style must equal (value/max)*100%.
    const { container } = render(<MetricBar value={75} max={100} />)
    const fill = container.querySelector('[data-testid="metric-bar-fill"]') ??
                 container.querySelector('.fill') ??
                 container.querySelector('[style*="width"]')
    expect(fill).not.toBeNull()
    const style = (fill as HTMLElement).getAttribute('style') ?? ''
    expect(style).toMatch(/75%/)
  })

  it('handles 0% correctly', () => {
    // Edge case: zero value must not crash and must show 0%.
    render(<MetricBar value={0} max={100} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles 100% correctly', () => {
    // Edge case: max value must render full bar.
    render(<MetricBar value={100} max={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('applies green color class when value is below 60%', () => {
    // Threshold: < 60 → green
    const { container } = render(<MetricBar value={40} max={100} />)
    const bar = container.querySelector('[data-testid="metric-bar-fill"]') ??
                container.querySelector('.fill') ??
                container.firstElementChild
    const cls = (bar as HTMLElement)?.className ?? ''
    // Accept either a CSS class containing "green" or an inline style with a green-ish color.
    const hasGreen =
      cls.toLowerCase().includes('green') ||
      (bar as HTMLElement)?.getAttribute('style')?.toLowerCase().includes('green') ||
      // Some implementations use a data attribute for the color tier.
      (bar as HTMLElement)?.closest('[data-tier="green"]') !== null
    expect(hasGreen).toBe(true)
  })

  it('applies yellow color class when value is between 60% and 80%', () => {
    // Threshold: 60–80 → yellow / warning
    const { container } = render(<MetricBar value={70} max={100} />)
    const bar = container.querySelector('[data-testid="metric-bar-fill"]') ??
                container.querySelector('.fill') ??
                container.firstElementChild
    const cls = (bar as HTMLElement)?.className ?? ''
    const hasYellow =
      cls.toLowerCase().includes('yellow') ||
      cls.toLowerCase().includes('warning') ||
      (bar as HTMLElement)?.getAttribute('style')?.toLowerCase().includes('yellow') ||
      (bar as HTMLElement)?.closest('[data-tier="yellow"]') !== null
    expect(hasYellow).toBe(true)
  })

  it('applies red color class when value is above 80%', () => {
    // Threshold: > 80 → red / danger
    const { container } = render(<MetricBar value={90} max={100} />)
    const bar = container.querySelector('[data-testid="metric-bar-fill"]') ??
                container.querySelector('.fill') ??
                container.firstElementChild
    const cls = (bar as HTMLElement)?.className ?? ''
    const hasRed =
      cls.toLowerCase().includes('red') ||
      cls.toLowerCase().includes('danger') ||
      cls.toLowerCase().includes('critical') ||
      (bar as HTMLElement)?.getAttribute('style')?.toLowerCase().includes('red') ||
      (bar as HTMLElement)?.closest('[data-tier="red"]') !== null
    expect(hasRed).toBe(true)
  })
})
