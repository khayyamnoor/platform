/**
 * Coinbase-themed Clerk appearance. Tokens mirror packages/ui/src/styles.css.
 * Imported by the root <ClerkProvider>; same instance covers <SignIn>,
 * <SignUp>, <UserButton>, and any embedded Clerk components.
 *
 * Type kept structural rather than importing `Appearance` from @clerk/types
 * (not exposed transitively under apps/web's strict node_modules); Clerk's
 * SDK validates the shape at the consumer.
 */
export const coinbaseAppearance = {
  variables: {
    colorPrimary: "#0052ff",
    colorText: "#0a0b0d",
    colorTextSecondary: "#5b616e",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#0a0b0d",
    colorDanger: "#cf202f",
    colorSuccess: "#05b169",
    colorWarning: "#f4b000",
    colorNeutral: "#7c828a",
    fontFamily:
      "'Coinbase Sans', -apple-system, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    borderRadius: "4px",
  },
  elements: {
    formButtonPrimary:
      "bg-[#0052ff] hover:bg-[#003ecc] text-white font-medium normal-case rounded-[4px]",
    card: "shadow-none border border-[#dee1e6]",
    headerTitle: "text-[#0a0b0d] font-medium tracking-tight",
    headerSubtitle: "text-[#5b616e]",
    socialButtonsBlockButton: "border-[#dee1e6] text-[#0a0b0d] hover:bg-[#f7f7f7] normal-case",
  },
} as const;
