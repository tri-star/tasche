/**
 * ログインページの背景要素コンポーネント
 * bg-blobs.svg と四隅の deco-*.svg を fixed で配置する
 */
export function LoginBackground() {
  return (
    <>
      <img
        src="/images/login/bg-blobs.svg"
        alt=""
        aria-hidden
        className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
      />
      <img
        src="/images/login/deco-tl.svg"
        alt=""
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[1] w-[min(200px,16vw)] h-[min(160px,20vh)]"
      />
      <img
        src="/images/login/deco-tr.svg"
        alt=""
        aria-hidden
        className="fixed top-0 right-0 pointer-events-none z-[1] w-[min(200px,16vw)] h-[min(160px,20vh)]"
      />
      <img
        src="/images/login/deco-bl.svg"
        alt=""
        aria-hidden
        className="fixed bottom-0 left-0 pointer-events-none z-[1] w-[min(280px,22vw)] h-[min(380px,42vh)]"
      />
      <img
        src="/images/login/deco-br.svg"
        alt=""
        aria-hidden
        className="fixed bottom-0 right-0 pointer-events-none z-[1] w-[min(340px,26vw)] h-[min(260px,30vh)]"
      />
    </>
  )
}
