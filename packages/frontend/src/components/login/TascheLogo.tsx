/**
 * Tasche ロゴコンポーネント（バッグアイコン + ロゴタイプテキスト）
 */
export function TascheLogo() {
  return (
    <>
      <img src="/images/login/logo-bag.svg" alt="Tasche" className="w-[68px] mb-2" />
      <div className="font-logo text-[52px] font-semibold leading-none text-tasche-green tracking-[0.01em] mb-8">
        Tasche
      </div>
    </>
  )
}
