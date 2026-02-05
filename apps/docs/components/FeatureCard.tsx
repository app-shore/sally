import * as React from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  href: string
}

export function FeatureCard({ title, description, icon, href }: FeatureCardProps) {
  return (
    <Link href={href} className="block transition-transform hover:scale-105">
      <Card className="h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label={title}>
              {icon}
            </span>
            <span className="text-lg">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
