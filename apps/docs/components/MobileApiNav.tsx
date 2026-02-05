'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ApiNav } from './ApiNav'

interface MobileApiNavProps {
  activeEndpointId?: string
}

export function MobileApiNav({ activeEndpointId }: MobileApiNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden mb-4">
          Browse Endpoints
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px]">
        <div className="mt-4">
          <ApiNav activeEndpointId={activeEndpointId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
