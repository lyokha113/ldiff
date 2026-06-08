import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MenuBar } from "@/components/MenuBar";

function setup(overrides = {}) {
  const props = {
    mode: "compare" as const, stagedTarget: undefined as "left" | "right" | undefined, stagedCount: 0,
    searchOpen: true, drawerOpen: false, canRefresh: true,
    onChangeMode: vi.fn(), onSave: vi.fn(), onRefresh: vi.fn(), onClearStaged: vi.fn(),
    onToggleSearch: vi.fn(), onToggleDrawer: vi.fn(),
    ...overrides,
  };
  render(<TooltipProvider><MenuBar {...props} /></TooltipProvider>);
  return props;
}

describe("MenuBar", () => {
  it("shows the staged badge when copies are pending", () => {
    setup({ stagedTarget: "right", stagedCount: 2 });
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
  it("hides the staged badge when nothing is staged", () => {
    setup({ stagedTarget: undefined, stagedCount: 0 });
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });
  it("toggles the drawer", async () => {
    const props = setup();
    await userEvent.click(screen.getByLabelText("Settings"));
    expect(props.onToggleDrawer).toHaveBeenCalled();
  });
  it("refreshes sources", async () => {
    const props = setup();
    await userEvent.click(screen.getByLabelText("Refresh sources"));
    expect(props.onRefresh).toHaveBeenCalled();
  });
  it("disables refresh when no source is loaded", () => {
    setup({ canRefresh: false });
    expect(screen.getByLabelText("Refresh sources")).toBeDisabled();
  });
});
