import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Tauri / Monaco mocks.
//
// This suite proves the File↔File merge wiring the running app exercises by
// clicking: the "Take all" and "Move hunk" toolbar buttons must call the
// backend with the correct args, and Save must commit every dirty side. The
// real backend and the real Monaco DiffEditor cannot run in jsdom, so both are
// mocked. Mocked invoke commands hit by the open→compare→inspect→merge→save
// path: platform_hints, validate_path, open_archive, compute_diff, read_entry,
// stage_write, commit_merge. (clear_staged / prefetch_siblings are never
// reached here but resolve defensively.)
// ---------------------------------------------------------------------------

const FILE_ENTRY = { path: "config.json", kind: "text" as const, uncompressedSize: 8 };

function fileSummary(side: "left" | "right") {
  return {
    path: side === "left" ? "/tmp/config.json" : "/tmp/other/config.json",
    metadata: { sourceKind: "file" as const, signed: false, multiRelease: false, zip64: false },
    entries: [FILE_ENTRY],
  };
}

const onePairDiff = {
  pairs: [
    {
      path: "config.json",
      status: "different" as const,
      left: { path: "config.json", kind: "text" as const },
      right: { path: "config.json", kind: "text" as const },
    },
  ],
};

function entryPreview(side: "left" | "right") {
  return {
    path: "config.json",
    kind: "text" as const,
    language: "json",
    content: side === "left" ? '{\n  "v": 1\n}\n' : '{\n  "v": 2\n}\n',
  };
}

const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
  switch (cmd) {
    case "platform_hints":
      return { os: "linux", sessionType: null, wayland: false, dropHint: null };
    case "validate_path":
      return (args?.raw as string) ?? "/tmp/config.json";
    case "open_archive":
      return fileSummary(args?.side as "left" | "right");
    case "compute_diff":
      return onePairDiff;
    case "read_entry":
      return entryPreview(args?.side as "left" | "right");
    case "stage_write":
    case "prefetch_siblings":
    case "clear_staged":
      return undefined;
    case "commit_merge":
      return {
        rewrittenPath: "/tmp/config.json",
        signatureInvalidated: false,
        copiedEntries: 1,
      };
    default:
      return undefined;
  }
});

// Deferred arrow: vi.mock factories are hoisted above the `invoke`/`chooseFile`
// declarations, so reference them lazily to avoid a TDZ error at mock time.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invoke(cmd, args),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: vi.fn(async () => vi.fn()),
    onCloseRequested: vi.fn(async () => vi.fn()),
    destroy: vi.fn(),
  }),
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => vi.fn()) }));

// chooseFile (plugin-dialog `open`) returns a fixed path; openPath then drives
// validate_path + open_archive.
const chooseFile = vi.fn(async () => "/tmp/config.json");
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: () => chooseFile() }));

// Mutable buffers so setValue is observable and moveHunk has real text to chew.
const LEFT_TEXT = '{\n  "v": 1\n}\n';
const RIGHT_TEXT = '{\n  "v": 2\n}\n';
const buffers = { left: LEFT_TEXT, right: RIGHT_TEXT };
const setOriginal = vi.fn((v: string) => { buffers.left = v; });
const setModified = vi.fn((v: string) => { buffers.right = v; });

function makeFakeDiffEditor() {
  // App's search-highlight effect calls deltaDecorations/revealLineInCenter on
  // each sub-editor whenever preview changes, so the fakes must expose them.
  const subEditor = (buf: "left" | "right", set: typeof setOriginal) => ({
    getValue: () => buffers[buf],
    setValue: set,
    onDidBlurEditorText: vi.fn(() => ({ dispose: vi.fn() })),
    getPosition: () => ({ lineNumber: 2 }),
    deltaDecorations: vi.fn(() => []),
    revealLineInCenter: vi.fn(),
  });
  const original = subEditor("left", setOriginal);
  const modified = subEditor("right", setModified);
  return {
    getOriginalEditor: () => original,
    getModifiedEditor: () => modified,
    getLineChanges: () => [
      {
        originalStartLineNumber: 2,
        originalEndLineNumber: 2,
        modifiedStartLineNumber: 2,
        modifiedEndLineNumber: 2,
      },
    ],
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    setModel: vi.fn(),
  };
}

// App imports "@/lib/monaco" purely for side effects (worker wiring); it pulls
// in `monaco-editor` and `?worker` modules vitest cannot resolve. Stub it.
vi.mock("@/lib/monaco", () => ({}));

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  // Single editor (single mode) — never reached here, stub it out.
  default: () => <div data-testid="editor" />,
  // DiffEditor fires onMount with a fake editor + monaco on render so App's
  // handleDiffMount captures it into diffEditorRef.
  DiffEditor: ({ onMount }: { onMount?: (e: unknown, m: unknown) => void }) => {
    onMount?.(makeFakeDiffEditor(), {});
    return <div data-testid="diff-editor" />;
  },
}));

// App must be imported AFTER the mocks are registered.
import { App } from "@/App";

async function driveIntoFileCompare(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  // Splash → Compare / Merge workspace.
  await user.click(screen.getByText("Compare / Merge"));

  // Open the left source via its repick popover → Browse file.
  await user.click(screen.getByLabelText("Change left source"));
  await user.click(await screen.findByText("Browse file"));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("open_archive", { path: "/tmp/config.json", side: "left" }));

  // Open the right source the same way.
  await user.click(screen.getByLabelText("Change right source"));
  await user.click(await screen.findByText("Browse file"));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("open_archive", { path: "/tmp/config.json", side: "right" }));

  // Inspect the lone pair so `selected` is set and read_entry populates preview.
  const row = await screen.findByText("config.json");
  await user.click(row);
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("read_entry", { side: "left", entryPath: "config.json" }));
}

describe("App file-merge wiring", () => {
  beforeEach(() => {
    invoke.mockClear();
    chooseFile.mockClear();
    setOriginal.mockClear();
    setModified.mockClear();
    buffers.left = LEFT_TEXT;
    buffers.right = RIGHT_TEXT;
    localStorage.clear();
  });

  it("Take all into right stages the left buffer onto the right", async () => {
    const user = userEvent.setup();
    await driveIntoFileCompare(user);

    await user.click(screen.getByLabelText("Take all into right"));

    // Right buffer is replaced with left's value, then staged to the right side.
    expect(setModified).toHaveBeenCalledWith(LEFT_TEXT);
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("stage_write", {
        side: "right",
        entryPath: "config.json",
        content: LEFT_TEXT,
      }),
    );
  });

  it("Move hunk into left copies into left and removes from right (copy+delete)", async () => {
    const user = userEvent.setup();
    await driveIntoFileCompare(user);

    await user.click(screen.getByLabelText("Move hunk into left"));

    // move = copy into target + delete from source: both editors get setValue,
    // and both sides receive a stage_write.
    expect(setOriginal).toHaveBeenCalled();
    expect(setModified).toHaveBeenCalled();
    const stageCalls = invoke.mock.calls.filter(([cmd]) => cmd === "stage_write");
    const sides = stageCalls.map(([, args]) => (args as { side: string }).side);
    expect(sides).toContain("left");
    expect(sides).toContain("right");
  });

  it("Save commits every dirty side via commit_merge", async () => {
    const user = userEvent.setup();
    await driveIntoFileCompare(user);

    // Dirty BOTH sides through a move-hunk (stages left + right).
    await user.click(screen.getByLabelText("Move hunk into left"));
    await waitFor(() => {
      const sides = invoke.mock.calls
        .filter(([cmd]) => cmd === "stage_write")
        .map(([, args]) => (args as { side: string }).side);
      expect(sides).toContain("left");
      expect(sides).toContain("right");
    });

    // Save is enabled once something is staged.
    await user.click(await screen.findByLabelText(/^Save to archive/));

    await waitFor(() => {
      const commits = invoke.mock.calls.filter(([cmd]) => cmd === "commit_merge");
      const committedSides = commits.map(([, args]) => (args as { targetSide: string }).targetSide);
      expect(committedSides).toContain("left");
      expect(committedSides).toContain("right");
    });
  });
});
