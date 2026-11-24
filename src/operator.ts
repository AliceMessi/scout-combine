/** Operator menu for booth staff: Ctrl+Shift+O opens it, Esc closes it. The game pauses while it is open. */

const CLEAR_LABELS = ['Clear today', 'Sure? Deletes all of today’s runs', 'Press once more to delete']

/** "Clear today" needs three presses in a row; no window.confirm (it would freeze the booth PC's full-screen tab). */
export function createClearFlow() {
  let step = 0
  return {
    label: () => CLEAR_LABELS[step],
    /** Returns true on the press that should delete. */
    press(): boolean {
      step++
      if (step < CLEAR_LABELS.length) return false
      step = 0
      return true
    },
    reset() {
      step = 0
    },
  }
}

export interface OperatorDeps {
  sound(): boolean
  setSound(on: boolean): void
  clearToday(): Promise<number>
  errors(): number
  savedRuns(): number
  /** Extra buttons added by other modules (e.g. Export CSV). */
  extra?: { label: string; run(): Promise<string> | string }[]
}

export interface OperatorMenu {
  isOpen(): boolean
  toggle(): void
}

export function createOperatorMenu(deps: OperatorDeps): OperatorMenu {
  const root = document.createElement('div')
  root.id = 'operator'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-label', 'Operator menu')
  root.hidden = true
  document.body.appendChild(root)
  const clear = createClearFlow()
  let status = ''

  const button = (label: string, onClick: () => void) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.addEventListener('click', onClick)
    return b
  }

  function render() {
    root.replaceChildren()
    const h = document.createElement('h2')
    h.textContent = 'Operator menu'
    const info = document.createElement('p')
    info.textContent = `Runs saved this session: ${deps.savedRuns()} · Errors: ${deps.errors()}`
    const buttons: HTMLButtonElement[] = []
    buttons.push(
      button(`Sound: ${deps.sound() ? 'ON' : 'OFF'}`, () => {
        clear.reset()
        deps.setSound(!deps.sound())
        render()
      }),
    )
    buttons.push(
      button(document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen', () => {
        clear.reset()
        const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
        p.catch(() => undefined).finally(render)
      }),
    )
    for (const x of deps.extra ?? []) {
      buttons.push(
        button(x.label, () => {
          clear.reset()
          Promise.resolve()
            .then(() => x.run())
            .then(
              msg => (status = msg),
              err => (status = `Failed: ${err instanceof Error ? err.message : String(err)}`),
            )
            .finally(render)
        }),
      )
    }
    const clearBtn = button(clear.label(), () => {
      if (!clear.press()) {
        render()
        root.querySelector<HTMLButtonElement>('button.danger')?.focus()
        return
      }
      status = 'Deleting…'
      deps
        .clearToday()
        .then(
          n => (status = `Deleted ${n} run${n === 1 ? '' : 's'} of today`),
          err => (status = `Not deleted: ${err instanceof Error ? err.message : String(err)}`),
        )
        .finally(render)
      render()
    })
    clearBtn.className = 'danger'
    buttons.push(clearBtn)
    buttons.push(button('Close (Esc)', () => toggle()))
    const s = document.createElement('p')
    s.className = 'status'
    s.setAttribute('aria-live', 'polite')
    s.textContent = status
    root.append(h, info, ...buttons, s)
  }

  function toggle() {
    root.hidden = !root.hidden
    clear.reset()
    status = ''
    if (!root.hidden) {
      render()
      root.querySelector('button')?.focus()
    }
  }

  window.addEventListener(
    'keydown',
    e => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
        e.preventDefault()
        e.stopImmediatePropagation()
        toggle()
      } else if (!root.hidden) {
        // Keys belong to the menu while it is open: the game never sees them.
        e.stopImmediatePropagation()
        if (e.key === 'Escape') toggle()
      }
    },
    { capture: true },
  )

  return { isOpen: () => !root.hidden, toggle }
}
