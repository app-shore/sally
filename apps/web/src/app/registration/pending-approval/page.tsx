import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <CardTitle>Registration Complete!</CardTitle>
              <CardDescription>Your account is pending approval</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-foreground">
              Thank you for registering with SALLY! Our team will review your application
              and approve your account within 24-48 hours. You&apos;ll receive an email once
              your account is activated.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
