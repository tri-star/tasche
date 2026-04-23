type Props = {
  onClick: () => void | Promise<void>
  disabled?: boolean
}

/**
 * Google ログインボタンコンポーネント
 * pill 形状、白背景、Google マーク + テキスト
 */
export function GoogleLoginButton({ onClick, disabled = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-[14px]
                 w-[320px] max-w-full px-6 py-4
                 bg-white rounded-pill
                 text-[15px] font-medium text-tasche-text tracking-[0.02em]
                 shadow-login-btn hover:shadow-login-btn-hover
                 hover:-translate-y-px active:translate-y-0
                 transition-[transform,box-shadow] duration-150 ease-out
                 disabled:opacity-60 disabled:pointer-events-none"
    >
      <img
        src="/images/login/google-mark.svg"
        alt=""
        aria-hidden
        className="w-[22px] h-[22px] flex-shrink-0"
      />
      Google でログイン
    </button>
  )
}
