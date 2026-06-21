# UI Follow-up Fixes Design

## Context

The full UI/UX refactor exposed four presentation regressions during native macOS app review:

1. Recent work is visually compressed and does not clearly communicate what is saved or how to reopen it.
2. The source rail repeats the visible labels `Left` and `Right` even though position already establishes side.
3. The Diff toolbar spreads related controls across the full width and leaves compare-only controls visible in View mode.
4. The Preferences grid stretches its header row, creating a large empty gap above navigation and content.

This change is presentation-only. It does not alter history persistence, source loading, merge semantics, preferences persistence, or backend contracts.

## Recent Work

Recent work becomes a dedicated section beneath the Compare and Decompile launch actions instead of occupying a small grid cell.

Each row shows:

- a `Compare` or `View` mode badge;
- the source basename or pair of basenames as the primary label;
- the source path or paths as secondary text with truncation and native title text;
- the relative time of the last successful open;
- a visible reopen affordance while keeping the complete row clickable.

The launch screen shows the five most recent entries. If more than five entries exist, it shows a `View all history` affordance that expands the same section to the complete locally stored list, up to the existing limit of 20. The empty state explicitly states that history appears after a source is opened. Clearing history remains an explicit destructive action in the section header.

History continues to be recorded only after a successful View source open or after both Compare sources are open. Reopening an entry continues to use the existing `onOpenEntry` flow.

## Source Rail

Remove the visible source-side identity column. A source slot contains only its icon, basename, path, and source picker trigger. Compare mode retains the exchange bridge between the two slots.

The semantic region labels `Left source` and `Right source`, picker labels, and path input labels remain unchanged for accessibility. The source kind remains available in the picker but is not given a permanent visual column in the rail.

## Diff Toolbar

The toolbar has two stable groups:

- left: `Source` and `Bytecode` view controls;
- right: compare and merge actions.

In Compare mode, actions are ordered by target direction:

1. `Copy file ←`
2. `Take all ←`
3. `Move hunk ←`
4. divider
5. `Move hunk →`
6. `Take all →`
7. `Copy file →`

Whole-entry copy actions use text labels instead of detached icon-only arrows. Existing enablement rules and tooltips remain authoritative. Hunk actions render only when hunk merge is available.

In View mode, every compare-only action is omitted from the DOM. The toolbar contains only the view controls and does not reserve empty space for merge actions.

At narrow widths, the compare action group scrolls horizontally inside the toolbar. Controls remain grouped and are never distributed to opposite viewport edges.

## Preferences Layout

The Preferences panel uses two explicit rows:

- `auto` for the compact header;
- `minmax(0, 1fr)` for navigation and content.

The header spans both columns. Navigation occupies the left column and content occupies the right column in the second row. Only the content pane scrolls vertically. Header and navigation remain stable.

The panel height remains bounded by its workspace container. On narrow screens, category navigation becomes a horizontally scrollable row above the content without introducing a stretched header.

## Accessibility

- Recent rows remain keyboard-operable buttons with meaningful accessible names.
- Side semantics remain exposed through region and picker labels after visual labels are removed.
- View mode does not expose irrelevant disabled merge controls to keyboard or screen-reader users.
- Preferences keeps its dialog name, category navigation label, pressed category state, and close button label.

## Testing

Component regression tests must prove:

- Recent work renders primary basenames, secondary paths, relative time, the clearer empty-state explanation, and expansion when more than five entries exist.
- Source slots preserve semantic left/right regions without rendering standalone `Left` or `Right` identity text.
- Compare mode renders labeled copy actions in the intended group and View mode renders no compare-only actions.
- Preferences exposes a compact header and a separately scrollable content region through stable structural classes.

Rendered QA covers startup history, Compare toolbar, View toolbar, Preferences, and a narrow viewport. It checks clipping, overflow, disabled-state clarity, console errors, and interaction behavior.

## Non-goals

- Changing the history storage key, limit, or persisted data shape.
- Adding pinning, search, removal of individual history entries, or filesystem availability checks.
- Changing copy, take-all, or move-hunk behavior.
- Redesigning Preferences controls or adding preference categories.
- Modifying backend, Tauri commands, sidecar behavior, or save semantics.
