import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/SearchBar";

function setup(overrides = {}) {
  const props = {
    open: true,
    context: "files" as const,
    mode: "compare" as const,
    query: "",
    treeFilter: "diff" as const,
    searchScope: "both" as const,
    includeSource: false,
    searching: false,
    onQueryChange: vi.fn(),
    onSearch: vi.fn(),
    onSearchAllFiles: vi.fn(),
    onCancel: vi.fn(),
    onClear: vi.fn(),
    onFilterChange: vi.fn(),
    onScopeChange: vi.fn(),
    onIncludeSourceChange: vi.fn(),
    ...overrides,
  };
  render(<SearchBar {...props} />);
  return props;
}

describe("SearchBar", () => {
  it("shows Files index controls on the Files tab", async () => {
    const props = setup({ query: "needle" });

    expect(screen.getByText("Files index")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search paths, text, constants")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByLabelText("Search scope")).toBeInTheDocument();
    expect(screen.getByLabelText("Tree filter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search all/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Include source search")).not.toBeChecked();

    await userEvent.click(screen.getByLabelText("Include source search"));
    expect(props.onIncludeSourceChange).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole("button", { name: /search all/i }));
    expect(props.onSearch).toHaveBeenCalled();
  });

  it("shows Current diff controls on a diff tab", async () => {
    const props = setup({ context: "diff", query: "needle" });

    expect(screen.getByText("Current diff")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find in current diff")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^find$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search all files/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /search all files/i }));
    expect(props.onSearchAllFiles).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    setup({ open: false });
    expect(screen.queryByText("Files index")).not.toBeInTheDocument();
  });

  it("fires clear and cancel actions", async () => {
    const props = setup({ searching: true });
    expect(screen.getByRole("button", { name: /search all/i })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /cancel search/i }));
    await userEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(props.onCancel).toHaveBeenCalled();
    expect(props.onClear).toHaveBeenCalled();
  });

  it("runs the primary search action from Enter", async () => {
    const props = setup({ query: "needle" });
    await userEvent.type(screen.getByPlaceholderText("Search paths, text, constants"), "{Enter}");
    expect(props.onSearch).toHaveBeenCalled();
  });
});
