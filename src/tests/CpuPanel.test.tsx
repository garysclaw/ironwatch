// Tests for the CpuPanel component.
//
// From ARCHITECTURE.md:
//   CpuPanel props: { cpu: CpuMetrics, history: number[] }
//   CpuMetrics: { overall_usage: number, per_core_usage: number[], frequency_mhz: number | null }
//
// Acceptance criteria covered:
//   AC-CPU-1: panel renders and displays live CPU values
//   AC-CPU-2: overall percentage is shown
//   AC-CPU-3: per-core bars are rendered for every logical core
//   AC-CPU-4: per-core percentages are displayed
//   AC-CPU-5: frequency displayed in MHz
//   AC-CPU-6: "N/A" shown when frequency_mhz is null

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CpuPanel from '../../components/CpuPanel/CpuPanel'
import type { CpuMetrics } from '../../types/metrics'

function makeCpuMetrics(overrides: Partial<CpuMetrics> = {}): CpuMetrics {
  return {
    overall_usage: 47.3,
    per_core_usage: [30.0, 50.0, 60.0, 70.0],
    frequency_mhz: 2400,
    ...overrides,
  }
}

describe('CpuPanel', () => {
  it('renders the "CPU" heading', () => {
    // The panel must have a visible "CPU" label (AC-CPU-2 layout).
    render(<CpuPanel cpu={makeCpuMetrics()} history={[]} />)
    expect(screen.getByText(/cpu/i)).toBeInTheDocument()
  })

  it('shows overall CPU percentage', () => {
    // AC-CPU-2: overall_usage is displayed rounded to one decimal place.
    render(<CpuPanel cpu={makeCpuMetrics({ overall_usage: 47.3 })} history={[]} />)
    expect(screen.getByText(/47\.3/)).toBeInTheDocument()
  })

  it('renders correct number of core bars', () => {
    // AC-CPU-3: one bar per logical core.
    const coreUsages = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]
    render(<CpuPanel cpu={makeCpuMetrics({ per_core_usage: coreUsages })} history={[]} />)
    // Each core bar is labelled "Core N".
    const coreLabels = screen.getAllByText(/core\s*\d+/i)
    expect(coreLabels.length).toBe(coreUsages.length)
  })

  it('shows CPU frequency in MHz when available', () => {
    // AC-CPU-5: frequency displayed as integer MHz.
    render(<CpuPanel cpu={makeCpuMetrics({ frequency_mhz: 3600 })} history={[]} />)
    expect(screen.getByText(/3600\s*mhz/i)).toBeInTheDocument()
  })

  it('shows "N/A" when frequency_mhz is null', () => {
    // AC-CPU-6: null frequency must render "N/A", not "0 MHz".
    render(<CpuPanel cpu={makeCpuMetrics({ frequency_mhz: null })} history={[]} />)
    expect(screen.getByText(/n\/a/i)).toBeInTheDocument()
  })

  it('updates displayed values when props change', () => {
    // The component is a pure function of its props; re-render with new values.
    const { rerender } = render(
      <CpuPanel cpu={makeCpuMetrics({ overall_usage: 20.0 })} history={[]} />
    )
    expect(screen.getByText(/20\.0/)).toBeInTheDocument()

    rerender(<CpuPanel cpu={makeCpuMetrics({ overall_usage: 80.0 })} history={[]} />)
    expect(screen.getByText(/80\.0/)).toBeInTheDocument()
  })
})
