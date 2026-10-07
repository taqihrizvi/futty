import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1 className="text-headline-lg">That page is missing</h1>
      <Link href="/" className="mt-4 inline-flex min-h-12 items-center font-semibold text-primary">
        Back home
      </Link>
    </div>
  );
}
