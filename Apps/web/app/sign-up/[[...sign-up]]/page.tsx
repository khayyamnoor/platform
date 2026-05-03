import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4 py-12">
      <SignUp />
    </main>
  );
}
