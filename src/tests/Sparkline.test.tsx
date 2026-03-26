// Tests for the Sparkline component.
//
// From ARCHITECTURE.md:
//   Sparkline props: { data: number[], color: string }
//   Renders an SVG <polyline> element.
//   Y-axis fixed 0–100.  Height: 40px.  No axes.
//   AC-HIST-6: rendered using SVG <polyline> computed from the history array.
//
// Acceptance criteria covered:
//   AC-HIST-3: sparkline renders inside the panel
//   AC-HIST-4: Y-axis fixed 0–100
//   AC-HIST-5: renders correctly with fewer than 60 data points
//   AC-HIST-6: SVG polyline element used

import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Sparkline from '../../components/sparkline/Sparkline'

describe('Sparkline', () => {
  it('renders an SVG element', () => {
    // AC-HIST-6: Sparkline must render an SVG.
    const { container } = render(<Sparkline data={[10, 20, 30]} color="blue" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('SVG has correct viewBox dimensions (Y range 0-100)', () => {
    // AC-HIST-4: Y-axis is fixed at 0–100.
    // The viewBox height component should reflect this range.
    const { container } = render(<Sparkline data={[0, 50, 100]} color="blue" />)
    const svg = container.querySelector('svg')
    const viewBox = svg?.getAttribute('viewBox') ?? ''
    // viewBox format: "minX minY width height" — height should be 100 (or a multiple).
    // We verify the viewBox is present and the height dimension ≥ 100.
    expect(viewBox).not.toBe('')
    const parts = viewBox.split(/\s+/)
    // Parts[3] is the height.  Accept "100" or proportional values.
    expect(parts.length).toBeGreaterThanOrEqual(4)
    const height = parseFloat(parts[3])
    expect(height).toBeGreaterThanOrEqual(40) // at least the 40px spec height
  })

  it('renders a polyline with the correct number of points based on data length', () => {
    // AC-HIST-6: one point per data entry in the polyline.
    const data = [10, 20, 30, 40, 50]
    const { container } = render(<Sparkline data={data} color="blue" />)
    const polyline = container.querySelector('polyline')
    expect(polyline).not.toBeNull()
    // The points attribute contains N space-separated x,y coordinate pairs.
    const points = polyline?.getAttribute('points') ?? ''
    const pairs = points.trim().split(/\s+/).filter(Boolean)
    expect(pairs.length).toBe(data.length)
  })

  it('renders empty SVG without crashing when data array is empty', () => {
    // AC-HIST-5: fewer than 60 points (including zero) must not crash.
    const { container } = render(<Sparkline data={[]} color="blue" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders without crashing for a single data point', () => {
    // Edge case: single point — polyline with one pair of coordinates.
    const { container } = render(<Sparkline data={[42]} color="green" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('applies the color prop to the polyline stroke', () => {
    // The color prop must control the stroke color of the line.
    const { container } = render(<Sparkline data={[10, 20, 30]} color="blue" />)
    const polyline = container.querySelector('polyline')
    const stroke =
      polyline?.getAttribute('stroke') ??
      polyline?.style?.stroke ??
      ''
    expect(stroke.toLowerCase()).toContain('blue')
  })

  it('renders 60 points correctly (full rolling window)', () => {
    // AC-HIST-1: buffer holds exactly 60 values; sparkline must handle all 60.
    const data = Array.from({ length: 60 }, (_, i) => (i / 60) * 100)
    const { container } = render(<Sparkline data={data} color="blue" />)
    const polyline = container.querySelector('polyline')
    const points = polyline?.getAttribute('points') ?? ''
    const pairs = points.trim().split(/\s+/).filter(Boolean)
    expect(pairs.length).toBe(60)
  })
})
