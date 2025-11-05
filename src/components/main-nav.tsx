"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, ShieldCheck } from 'lucide-react';

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Painel',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    ...(user?.isAdmin ? [{
      href: '/admin',
      label: 'Admin',
      icon: ShieldCheck,
      active: pathname === '/admin',
    }] : []),
  ];

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton as="a" isActive={item.active} tooltip={item.label}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
