/**
 * ログインページのフッターコンポーネント
 * プライバシーポリシー / 利用規約 / お問い合わせ リンクとコピーライト
 * 将来 /legal/* ルートが確定したら href を更新する
 */
export function LoginFooter() {
  return (
    <footer className="relative z-10 w-full px-4 pb-4 pt-6 text-center text-[12.5px] text-tasche-textMuted">
      <div className="flex justify-center gap-10 mb-[10px] flex-wrap">
        <button
          type="button"
          className="text-tasche-textSub hover:text-tasche-green transition-colors duration-150 bg-transparent border-none p-0 cursor-pointer text-[12.5px]"
        >
          プライバシーポリシー
        </button>
        <button
          type="button"
          className="text-tasche-textSub hover:text-tasche-green transition-colors duration-150 bg-transparent border-none p-0 cursor-pointer text-[12.5px]"
        >
          利用規約
        </button>
        <button
          type="button"
          className="text-tasche-textSub hover:text-tasche-green transition-colors duration-150 bg-transparent border-none p-0 cursor-pointer text-[12.5px]"
        >
          お問い合わせ
        </button>
      </div>
      <div className="text-tasche-textMuted">© 2026 Tasche</div>
    </footer>
  )
}
