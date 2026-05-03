import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  Progress,
  Skeleton,
  Textarea,
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../index.js";

/**
 * Mount tests: every component renders without throwing under happy-dom.
 * Visual verification (light + dark screenshots) is manual per the issue's
 * "Visual verification (manual)" line.
 */
describe("ui mount smoke", () => {
  test("Button — every variant + size renders", () => {
    const variants = ["primary", "secondary", "ghost", "destructive", "link"] as const;
    const sizes = ["sm", "md", "lg", "icon"] as const;
    for (const variant of variants) {
      for (const size of sizes) {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            Click
          </Button>,
        );
        unmount();
      }
    }
  });

  test("Input renders with placeholder", () => {
    const { getByPlaceholderText } = render(<Input placeholder="Email" />);
    expect(getByPlaceholderText("Email")).toBeTruthy();
  });

  test("Textarea renders with placeholder", () => {
    const { getByPlaceholderText } = render(<Textarea placeholder="Notes" />);
    expect(getByPlaceholderText("Notes")).toBeTruthy();
  });

  test("Card renders with all subparts", () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(getByText("Title")).toBeTruthy();
    expect(getByText("Body")).toBeTruthy();
  });

  test("Badge renders every variant", () => {
    const variants = ["neutral", "primary", "up", "down", "warning"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>label</Badge>);
      unmount();
    }
  });

  test("Skeleton renders", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    expect(container.firstChild).toBeTruthy();
  });

  test("Modal trigger renders (overlay/content portal-rendered on open)", () => {
    const { getByRole } = render(
      <Modal>
        <ModalTrigger>open</ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Hello</ModalTitle>
            <ModalDescription>desc</ModalDescription>
          </ModalHeader>
        </ModalContent>
      </Modal>,
    );
    expect(getByRole("button", { name: /open/i })).toBeTruthy();
  });

  test("Toast viewport renders inside provider", () => {
    const { container } = render(
      <ToastProvider>
        <Toast open>
          <ToastTitle>hi</ToastTitle>
          <ToastDescription>msg</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );
    expect(container.querySelector("[role='region']")).toBeTruthy();
  });

  test("DropdownMenu trigger renders", () => {
    const { getByRole } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(getByRole("button", { name: /menu/i })).toBeTruthy();
  });

  test("Avatar with fallback renders", () => {
    const { getByText } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(getByText("AB")).toBeTruthy();
  });

  test("Progress renders with value", () => {
    const { container } = render(<Progress value={42} />);
    expect(container.querySelector("[role='progressbar']")).toBeTruthy();
  });

  test("Tooltip trigger renders inside provider", () => {
    const { getByText } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover</TooltipTrigger>
          <TooltipContent>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(getByText("hover")).toBeTruthy();
  });
});
