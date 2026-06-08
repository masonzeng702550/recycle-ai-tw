import type { Metadata } from "next";
import AdminNav from "@/components/admin/AdminNav";

// 後台一律 noindex（同時 robots.txt 也擋了 /admin/，這是雙保險）
export const metadata: Metadata = {
  title: { default: "後台", template: "%s｜Trashform Admin" },
  robots: { index: false, follow: false },
};

export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-black text-neutral-100 md:flex">
      <AdminNav />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
