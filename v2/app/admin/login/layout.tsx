import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理員登入｜Trashform",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
