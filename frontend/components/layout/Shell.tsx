"use client";

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar'

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      {/* Provider renders a flex container; keep Sidebar and Inset as siblings */}
      <AppSidebar />
      <SidebarInset className="min-h-screen">
        <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
        </header>
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
