// Tests for the ProcessTable component.
//
// From ARCHITECTURE.md:
//   ProcessTable props: { processes: ProcessEntry[] }
//   ProcessEntry: { pid, name, cpu_usage, memory_bytes, status }
//   Default sort: cpu_usage descending
//   Local sort state: { column: SortColumn, direction: 'asc' | 'desc' }
//
// Acceptance criteria covered:
//   AC-PROC-2: correct number of rows rendered
//   AC-PROC-3: clicking column header changes sort order
//   AC-PROC-4: active sort column visually indicated
//   AC-PROC-5: memory displayed in MiB
//   AC-PROC-6: CPU % displayed with one decimal
//   AC-PROC-7: status is one of the six defined values

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ProcessTable from '../../components/processes/ProcessTable'
import type { ProcessEntry } from '../../types/metrics'

const MiB = 1_048_576

function makeProcesses(): ProcessEntry[] {
  return [
    { pid: 100, name: 'alpha',   cpu_usage: 5.0,  memory_bytes: 100 * MiB, status: 'Running'  },
    { pid: 200, name: 'charlie', cpu_usage: 25.0, memory_bytes: 200 * MiB, status: 'Sleeping' },
    { pid: 300, name: 'beta',    cpu_usage: 15.0, memory_bytes: 150 * MiB, status: 'Running'  },
  ]
}

describe('ProcessTable', () => {
  it('renders table headers: PID, Name, CPU%, Memory, Status', () => {
    // AC-PROC-2 (layout): all required column headers must be present.
    render(<ProcessTable processes={makeProcesses()} />)
    expect(screen.getByText(/pid/i)).toBeInTheDocument()
    expect(screen.getByText(/name/i)).toBeInTheDocument()
    expect(screen.getByText(/cpu\s*%/i)).toBeInTheDocument()
    expect(screen.getByText(/memory/i)).toBeInTheDocument()
    expect(screen.getByText(/status/i)).toBeInTheDocument()
  })

  it('renders correct number of process rows', () => {
    // AC-PROC-2: one row per ProcessEntry in the prop array.
    const processes = makeProcesses()
    render(<ProcessTable processes={processes} />)
    // Each row contains the process name — use name as unique row selector.
    for (const proc of processes) {
      expect(screen.getByText(proc.name)).toBeInTheDocument()
    }
  })

  it('sorts by CPU% descending by default', () => {
    // AC-PROC-3 default: highest cpu_usage appears first.
    render(<ProcessTable processes={makeProcesses()} />)
    const rows = screen.getAllByRole('row')
    // rows[0] is the header; rows[1] should be the highest CPU process.
    expect(rows[1]).toHaveTextContent('charlie') // 25.0%
    expect(rows[2]).toHaveTextContent('beta')    // 15.0%
    expect(rows[3]).toHaveTextContent('alpha')   //  5.0%
  })

  it('sorts alphabetically when Name header is clicked', () => {
    // AC-PROC-3: clicking Name column header sorts A→Z ascending.
    render(<ProcessTable processes={makeProcesses()} />)
    fireEvent.click(screen.getByText(/name/i))
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('alpha')
    expect(rows[2]).toHaveTextContent('beta')
    expect(rows[3]).toHaveTextContent('charlie')
  })

  it('reverses sort order when CPU% header is clicked again', () => {
    // AC-PROC-3: clicking the active sort column toggles asc/desc.
    render(<ProcessTable processes={makeProcesses()} />)
    // Default is CPU% descending. Click CPU% header to switch to ascending.
    fireEvent.click(screen.getByText(/cpu\s*%/i))
    const rows = screen.getAllByRole('row')
    // Ascending → lowest CPU first.
    expect(rows[1]).toHaveTextContent('alpha')   // 5.0%
    expect(rows[2]).toHaveTextContent('beta')    // 15.0%
    expect(rows[3]).toHaveTextContent('charlie') // 25.0%
  })

  it('displays an arrow indicator on the active sort column', () => {
    // AC-PROC-4: sort direction indicator must be visible on the active header.
    render(<ProcessTable processes={makeProcesses()} />)
    // The CPU% header should contain an arrow character (↑ or ↓).
    const cpuHeader = screen.getByText(/cpu\s*%/i).closest('th') ??
                      screen.getByText(/cpu\s*%/i)
    expect(cpuHeader?.textContent).toMatch(/[↑↓▲▼]/)
  })

  it('renders memory in MiB with one decimal place', () => {
    // AC-PROC-5: memory_bytes converted to MiB, one decimal place.
    render(<ProcessTable processes={makeProcesses()} />)
    // 100 MiB → "100.0 MiB"
    expect(screen.getByText(/100\.0\s*MiB/i)).toBeInTheDocument()
  })

  it('renders CPU% with one decimal place', () => {
    // AC-PROC-6: cpu_usage rendered as "X.X%".
    render(<ProcessTable processes={makeProcesses()} />)
    expect(screen.getByText(/25\.0\s*%/)).toBeInTheDocument()
  })

  it('renders process status as one of the six valid values', () => {
    // AC-PROC-7: status column must show a valid status string.
    render(<ProcessTable processes={makeProcesses()} />)
    expect(screen.getAllByText(/running/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/sleeping/i)).toBeInTheDocument()
  })
})
