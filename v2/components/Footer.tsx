import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-neutral-900 text-center text-xs text-neutral-600 space-y-1">
      <p>
        本工具為臺北市數位實驗高中公民行動學期專題（v2.1），分類規則僅供參考，最終以各市環保局公告為準。
      </p>
      <p>
        <a
          href="https://recycle.rethinktw.org/"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          資料骨架參考：回收大百科
        </a>
      </p>
      <p className="pt-1">
        <Link
          href="/admin/login"
          className="text-neutral-700 hover:text-neutral-400 transition-colors"
        >
          管理員登入
        </Link>
      </p>
    </footer>
  );
}
