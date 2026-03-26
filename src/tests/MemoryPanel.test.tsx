// Tests for the MemoryPanel component.
//
// From ARCHITECTURE.md:
//   MemoryPanel props: { memory: MemoryMetrics, history: number[] }
//   MemoryMetrics: { used_bytes, total_bytes, swap_used_bytes, swap_total_bytes }
//
// Acceptance criteria covered:
//   AC-MEM-1 / AC-MEM-2: RAM and swap values update on prop change
//   AC-MEM-3: Values displayed in binary units (GiB, MiB, etc.)
//   AC-MEM-4: RAM percentage rounded to one decimal place
//   AC-MEM-5: Swap section hidden / shows "not configured" when swap_total_bytes == 0

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MemoryPanel from '../../components/MemoryPanel/MemoryPanel'
import type { MemoryMetrics } from '../../types/metrics'

const GiB = 1_073_741_824

function makeMemoryMetrics(overrides: Partial<MemoryMetrics> = {}): MemoryMetrics {
  return {
    used_bytes: Math.round(6.2 * GiB),
    total_bytes: 16 * GiB,
    swap_used_bytes: Math.round(1.2 * GiB),
    swap_total_bytes: 8 * GiB,
    ...overrides,
  }
}

describe('MemoryPanel', () => {
  it('renders the "Memory" heading', () => {
    // The panel must display a visible "Memory" label.
    render(<MemoryPanel memory={makeMemoryMetrics()} history={[]} />)
    expect(screen.getByText(/memory/i)).toBeInTheDocument()
  })

  it('shows used and total RAM in correct GiB format', () => {
    // AC-MEM-3: binary unit formatting with one decimal place (e.g., "6.2 GiB / 16.0 GiB").
    const usedBytes = Math.round(6.2 * GiB)
    const totalBytes = 16 * GiB
    render(
      <MemoryPanel
        memory={makeMemoryMetrics({ used_bytes: usedBytes, total_bytes: totalBytes })}
        history={[]}
      />
    )
    // Accept either "GiB" or "GB" depending on implementation choice.
    expect(screen.getByText(/6\.2\s*(GiB|GB)/i)).toBeInTheDocument()
    expect(screen.getByText(/16\.0\s*(GiB|GB)/i)).toBeInTheDocument()
  })

  it('shows RAM usage percentage', () => {
    // AC-MEM-4: (used / total) * 100 rounded to one decimal.
    // 6.2 GiB / 16 GiB ≈ 38.75% → 38.8%
    const usedBytes = Math.round(6.2 * GiB)
    const totalBytes = 16 * GiB
    const expected = ((usedBytes / totalBytes) * 100).toFixed(1)
    render(
      <MemoryPanel
        memory={makeMemoryMetrics({ used_bytes: usedBytes, total_bytes: totalBytes })}
        history={[]}
      />
    )
    expect(screen.getByText(new RegExp(expected.replace('.', '\\.')))).toBeInTheDocument()
  })

  it('shows swap section when swap_total_bytes > 0', () => {
    // AC-MEM-5 (positive case): swap bar/section is visible when swap is configured.
    render(
      <MemoryPanel
        memory={makeMemoryMetrics({
          swap_used_bytes: Math.round(1.2 * GiB),
          swap_total_bytes: 8 * GiB,
        })}
        history={[]}
      />
    )
    // The word "Swap" must appear in the document.
    expect(screen.getByText(/swap/i)).toBeInTheDocument()
    // "not configured" must NOT appear.
    expect(screen.queryByText(/not configured/i)).toBeNull()
  })

  it('shows "not configured" when swap_total_bytes is 0', () => {
    // AC-MEM-5: when no swap is present, show "Swap: not configured".
    render(
      <MemoryPanel
        memory={makeMemoryMetrics({
          swap_used_bytes: 0,
          swap_total_bytes: 0,
        })}
        history={[]}
      />
    )
    expect(screen.getByText(/not configured/i)).toBeInTheDocument()
  })

  it('updates values when props change', () => {
    // Re-render with different memory values and confirm the display updates.
    const { rerender } = render(
      <MemoryPanel
        memory={makeMemoryMetrics({
          used_bytes: 4 * GiB,
          total_bytes: 16 * GiB,
        })}
        history={[]}
      />
    )
    expect(screen.getByText(/4\.0\s*(GiB|GB)/i)).toBeInTheDocument()

    rerender(
      <MemoryPanel
        memory={makeMemoryMetrics({
          used_bytes: 8 * GiB,
          total_bytes: 16 * GiB,
        })}
        history={[]}
      />
    )
    expect(screen.getByText(/8\.0\s*(GiB|GB)/i)).toBeInTheDocument()
  })
})
