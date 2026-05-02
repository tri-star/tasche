import { useAtomValue } from "jotai"
import { currentUserAtom } from "@/auth/atoms"
import { useAuth } from "@/auth/useAuth"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AccountPage() {
  const currentUser = useAtomValue(currentUserAtom)
  const { logout } = useAuth()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-tasche-text">アカウント</h1>

        {/* プロフィール Card */}
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tasche-greenSoft text-lg font-semibold text-tasche-text">
                  {currentUser?.name?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="space-y-1">
                <p className="font-medium text-tasche-text">{currentUser?.name}</p>
                <p className="text-sm text-tasche-textSub">{currentUser?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ログアウト Card */}
        <Card>
          <CardHeader>
            <CardTitle>ログアウト</CardTitle>
            <CardDescription>Tascheからサインアウトします。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout}>
              ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
