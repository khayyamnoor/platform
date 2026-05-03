import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import App from "./App.js";
import { type GatewayLike, GatewayProvider } from "./gateway-context.js";

const mockGateway: GatewayLike = {
  models: {
    generateContent: vi.fn().mockResolvedValue({
      text: JSON.stringify({ analysisSummary: "ok", videos: [] }),
    }),
  },
};

describe("cinematic-ai-video-director (ported)", () => {
  test("default export renders the form without throwing when wrapped in GatewayProvider", () => {
    render(
      <GatewayProvider value={mockGateway}>
        <App />
      </GatewayProvider>,
    );

    // getBy* throws if not found, so calling it is the assertion. Avoid
    // toBeInTheDocument() so we don't pull in @testing-library/jest-dom.
    expect(screen.getByPlaceholderText(/canvas-design/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /render canvas design/i })).toBeTruthy();
    expect(screen.getByText(/Director's/i)).toBeTruthy();
  });

  test("throws a clear error if rendered outside a GatewayProvider", () => {
    // Suppress React's expected-error console output during this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<App />)).toThrow(/GatewayProvider/);
    spy.mockRestore();
  });
});
