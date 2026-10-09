// @vitest-environment happy-dom

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AddRepoHostSelector } from './AddRepoHostSelector'
import type { SidebarHostOption } from './sidebar-host-options'

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandItem: ({
    children,
    disabled,
    className,
    'aria-disabled': ariaDisabled
  }: {
    children: React.ReactNode
    disabled?: boolean
    className?: string
    'aria-disabled'?: React.AriaAttributes['aria-disabled']
  }) => (
    <div aria-disabled={ariaDisabled ?? disabled} className={className}>
      {children}
    </div>
  )
}))

const HOSTS_BY_HEALTH: SidebarHostOption[] = [
  {
    id: 'local',
    label: 'Local Mac',
    detail: 'This computer',
    kind: 'local',
    health: 'local',
    presence: 'local'
  },
  {
    id: 'ssh:ready',
    label: 'Ready box',
    detail: 'SSH',
    kind: 'ssh',
    health: 'available',
    presence: 'configured'
  },
  {
    id: 'ssh:waking',
    label: 'Waking box',
    detail: 'SSH',
    kind: 'ssh',
    health: 'connecting',
    presence: 'configured'
  },
  {
    id: 'ssh:builder',
    label: 'Builder',
    detail: 'SSH',
    kind: 'ssh',
    health: 'disconnected',
    presence: 'configured'
  },
  {
    id: 'ssh:broken',
    label: 'Broken box',
    detail: 'SSH',
    kind: 'ssh',
    health: 'error',
    presence: 'configured'
  },
  {
    id: 'runtime:old-server',
    label: 'Old server',
    detail: 'Orca server',
    kind: 'runtime',
    health: 'blocked',
    presence: 'active'
  }
]

function renderHostPicker(selectedHostId: SidebarHostOption['id']): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(
    <AddRepoHostSelector
      hosts={HOSTS_BY_HEALTH}
      selectedHostId={selectedHostId}
      open
      onOpenChange={vi.fn()}
      onSelectHost={vi.fn()}
      onConnectHost={vi.fn()}
    />
  )
  return container
}

/** The fill of the status dot drawn before each place (trigger or row) the host label appears. */
function statusDotFills(container: HTMLElement, label: string): (string | null)[] {
  return Array.from(container.querySelectorAll('span'))
    .filter((span) => span.children.length === 0 && span.textContent === label)
    .map((span) => {
      const owner = span.closest('button, div')
      const dot = owner?.querySelector('span[aria-hidden="true"].rounded-full')
      if (!dot || !(dot.compareDocumentPosition(span) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        return null
      }
      return Array.from(dot.classList).find((name) => name.startsWith('bg-')) ?? null
    })
}

function findButton(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === text
  )
}

describe('AddRepoHostSelector', () => {
  it('marks every host row and the selected host with a status dot for its health', () => {
    const container = renderHostPicker('ssh:ready')

    // The selected host appears twice: in the trigger and in its row.
    expect(statusDotFills(container, 'Ready box')).toEqual([
      'bg-status-success',
      'bg-status-success'
    ])
    expect(statusDotFills(container, 'Local Mac')).toEqual(['bg-status-success'])
    expect(statusDotFills(container, 'Waking box')).toEqual(['bg-status-warning'])
    expect(statusDotFills(container, 'Builder')).toEqual(['bg-muted-foreground/40'])
    expect(statusDotFills(container, 'Broken box')).toEqual(['bg-destructive'])
    expect(statusDotFills(container, 'Old server')).toEqual(['bg-destructive'])
    // The worded status stays next to the dot for screen readers.
    expect(container.textContent).toContain('Connected - SSH')
    expect(container.textContent).toContain('Disconnected - SSH')
  })

  it('shows the green dot on the trigger when Local is selected', () => {
    const container = renderHostPicker('local')

    expect(statusDotFills(container, 'Local Mac')).toEqual([
      'bg-status-success',
      'bg-status-success'
    ])
  })

  it('renders the Connect action as an outlined button', () => {
    const container = renderHostPicker('local')

    expect(findButton(container, 'Connect')?.dataset.variant).toBe('outline')
    expect(findButton(container, 'Connecting')?.dataset.variant).toBe('outline')
  })

  it('shows a remote host setup menu when Local Mac is the only host', () => {
    const html = renderToStaticMarkup(
      <AddRepoHostSelector
        hosts={[
          {
            id: 'local',
            label: 'Local Mac',
            detail: 'This computer',
            kind: 'local',
            health: 'local',
            presence: 'local'
          }
        ]}
        selectedHostId="local"
        open
        onOpenChange={vi.fn()}
        onSelectHost={vi.fn()}
        onAddSshHost={vi.fn()}
        onAddRemoteServer={vi.fn()}
      />
    )

    expect(html).toContain('Add remote host')
    expect(html).toContain('Add SSH host')
    expect(html).toContain('Use an existing machine over SSH.')
    expect(html).toContain('Add remote server')
    expect(html).toContain('Pair with Orca running on another computer.')
  })

  it('shows disconnected SSH hosts with a connect action in Add Project', () => {
    const html = renderToStaticMarkup(
      <AddRepoHostSelector
        hosts={[
          {
            id: 'local',
            label: 'Local Mac',
            detail: 'This computer',
            kind: 'local',
            health: 'local',
            presence: 'local'
          },
          {
            id: 'ssh:ssh-1',
            label: 'Builder',
            detail: 'SSH',
            kind: 'ssh',
            health: 'disconnected',
            presence: 'configured'
          }
        ]}
        selectedHostId="ssh:ssh-1"
        open={false}
        onOpenChange={vi.fn()}
        onSelectHost={vi.fn()}
      />
    )

    expect(html).toContain('Builder')
    expect(html).toContain('Disconnected')
    expect(html).toContain('Connect')
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toContain('cursor-not-allowed')
    expect(html).not.toContain('opacity-55')
  })

  it('shows exact update guidance for incompatible runtime hosts', () => {
    const html = renderToStaticMarkup(
      <AddRepoHostSelector
        hosts={[
          {
            id: 'local',
            label: 'Local Mac',
            detail: 'This computer',
            kind: 'local',
            health: 'local',
            presence: 'local'
          },
          {
            id: 'runtime:old-server',
            label: 'Old server',
            detail: 'Orca server',
            kind: 'runtime',
            health: 'blocked',
            presence: 'active',
            compatibility: {
              kind: 'blocked',
              reason: 'server-too-old',
              clientProtocolVersion: 5,
              serverProtocolVersion: 1,
              requiredServerProtocolVersion: 4
            }
          }
        ]}
        selectedHostId="runtime:old-server"
        open
        onOpenChange={vi.fn()}
        onSelectHost={vi.fn()}
      />
    )

    expect(html).toContain('Update needed')
    expect(html).toContain('The selected Orca server is too old for this client.')
    expect(html).toContain('Update Orca on the server.')
    expect(html).toContain('aria-disabled="true"')
  })
})
