import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

// Both next/link and @clerk/nextjs's UserButton expect the Next.js App Router
// runtime which doesn't exist under vitest+happy-dom. Stub both so the unit
// test exercises the Header's structure without needing the full app shell.
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <span data-testid="clerk-userbutton-stub" />,
}));

const { Header } = await import("./header");

describe("Header", () => {
  test("renders FREE badge + 1000 credits + brand mark for a fresh trial wallet", () => {
    render(<Header plan="FREE" credits={1000} />);
    expect(screen.getByText(/Free/i)).toBeTruthy();
    expect(screen.getByText("1,000 credits")).toBeTruthy();
    expect(screen.getByText(/^Platform$/)).toBeTruthy();
  });

  test("renders subscribed plan label + formatted credit count", () => {
    render(<Header plan="PRO_60" credits={6500} email="user@example.com" />);
    expect(screen.getByText(/Pro/)).toBeTruthy();
    expect(screen.getByText("6,500 credits")).toBeTruthy();
  });

  test("FREE wallet shows neutral badge styling, paid plans show primary", () => {
    const { container, unmount } = render(<Header plan="FREE" credits={1000} />);
    const freeBadge = container.querySelector("span[aria-label='Plan: Free']");
    expect(freeBadge?.className).toContain("var(--color-surface-strong)");
    unmount();

    const { container: c2 } = render(<Header plan="STARTER_30" credits={3000} />);
    const paidBadge = c2.querySelector("span[aria-label='Plan: Starter']");
    expect(paidBadge?.className).toContain("var(--color-primary)");
  });

  test("credit pill carries an a11y label for screen readers", () => {
    render(<Header plan="MAX_90" credits={12000} />);
    const pill = screen.getByLabelText(/Credits remaining: 12000/);
    expect(pill).toBeTruthy();
  });
});
