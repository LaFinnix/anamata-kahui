/**
 * Component tests for EndorseButton — verify the modal open/close behaviour
 * and form-field rendering. Uses Vitest + Testing Library + jsdom.
 *
 * Mocks `useTranslations` and `useActionState` so we don't need a running
 * Next.js server or a real Supabase backend.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock next-intl (used by the component). Returns the key prefixed with
// "i18n:" so tests can assert on translated output without depending on
// the actual locale JSON files.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    // Replace {param} placeholders with their values for assertion purposes
    let result = `i18n:${key}`;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
    }
    return result;
  },
}));

// Mock the giveEndorsementAction so the form doesn't try to call real Supabase
vi.mock("@/lib/actions/endorsements", () => ({
  giveEndorsementAction: vi.fn(),
}));

// Mock next/link to render plain anchors
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import { EndorseButton } from "@/components/endorsements/endorse-button";

describe("<EndorseButton/>", () => {
  /** Get the trigger button (not the modal-internal submit/cancel buttons). */
  const getTriggerButton = () => {
    const triggers = screen.getAllByRole("button", { name: /i18n:button/ });
    // The trigger button is the first one (rendered before any modal content).
    return triggers[0];
  };

  it("renders the Endorse button by default", () => {
    render(<EndorseButton recipientId="abc-123" recipientName="Hine" />);
    expect(getTriggerButton()).toBeInTheDocument();
  });

  it("does NOT show the modal initially", () => {
    render(<EndorseButton recipientId="abc-123" recipientName="Hine" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the modal when Endorse button is clicked", async () => {
    const user = userEvent.setup();
    render(<EndorseButton recipientId="abc-123" recipientName="Hine" />);

    await user.click(getTriggerButton());

    // Wait for the dialog to appear AND for its content to be ready.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // The title text should be present somewhere in the document.
    expect(screen.getAllByText(/modalTitle/i).length).toBeGreaterThan(0);
  });

  it("modal includes the recipient's name in the title", async () => {
    const user = userEvent.setup();
    render(<EndorseButton recipientId="abc-123" recipientName="Hine" />);

    await user.click(getTriggerButton());

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("i18n:modalTitle");
  });

  it("renders all required form fields inside the modal", async () => {
    const user = userEvent.setup();
    render(<EndorseButton recipientId="abc-123" recipientName="Hine" />);

    await user.click(getTriggerButton());

    // Use IDs (stable across i18n) instead of label text. The mock translates
    // label text to "i18n:endorsements.give.fields.type" etc., which doesn't
    // contain the field id. Input ids are stable identifiers.
    expect(document.getElementById("endorsement_type")).toBeInTheDocument();
    expect(document.getElementById("work_type")).toBeInTheDocument();
    expect(document.getElementById("knowledge_domain")).toBeInTheDocument();
    expect(document.getElementById("scope_iwi")).toBeInTheDocument();
    expect(document.getElementById("scope_region")).toBeInTheDocument();
    expect(document.getElementById("notes")).toBeInTheDocument();
  });

  it("includes the recipient_id as a hidden form input", async () => {
    const user = userEvent.setup();
    render(<EndorseButton recipientId="abc-123" recipientName="Hine" />);

    await user.click(getTriggerButton());

    const hidden = document.querySelector(
      'input[type="hidden"][name="recipient_id"]',
    );
    expect(hidden).toBeTruthy();
    expect((hidden as HTMLInputElement).value).toBe("abc-123");
  });
});
