'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Moon,
  BookOpen,
  Settings,
  Container,
  Folder,
  Terminal,
  Archive,
  MessageSquare,
  Activity,
  Users,
  Clock,
  Radio,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';
import { NavLink } from './nav-link';
import { useTranslation } from '@/i18n/client';

const MORE_MONITOR_ITEMS = [
  { href: '/traces', icon: Activity, labelKey: 'nav.traces' },
  { href: '/sessions', icon: MessageSquare, labelKey: 'nav.sessions' },
  { href: '/scheduled-tasks', icon: Clock, labelKey: 'nav.scheduledTasks' },
  { href: '/channels', icon: Radio, labelKey: 'nav.channels' },
];

const MORE_SYSTEM_ITEMS = [
  { href: '/executors', icon: Container, labelKey: 'nav.executors' },
  { href: '/files', icon: Folder, labelKey: 'nav.files' },
  { href: '/environment', icon: Terminal, labelKey: 'nav.environment' },
  { href: '/accounts', icon: Users, labelKey: 'nav.accounts' },
  { href: '/backup', icon: Archive, labelKey: 'nav.backup' },
];

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center px-4">
        {/* Left: Logo + Brand + Primary Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Skill Compose" width={28} height={28} />
            <span className="text-sm font-semibold hidden sm:inline">Skill Compose</span>
          </Link>

          <nav className="flex items-center gap-4">
            <NavLink href="/agents">{t('nav.agents')}</NavLink>
            <NavLink href="/skills">{t('nav.skills')}</NavLink>
            <NavLink href="/tools">{t('nav.tools')}</NavLink>
            <NavLink href="/mcp">{t('nav.mcp')}</NavLink>
          </nav>
        </div>

        {/* Right: More dropdown + Docs + Language + Theme */}
        <TooltipProvider delayDuration={300}>
          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('nav.more')}>
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
                  {t('nav.groupMonitor')}
                </DropdownMenuLabel>
                {MORE_MONITOR_ITEMS.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {t(item.labelKey)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
                  {t('nav.groupSystem')}
                </DropdownMenuLabel>
                {MORE_SYSTEM_ITEMS.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {t(item.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:62630'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon" aria-label={t('tooltips.documentation')}>
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('tooltips.documentation')}</p>
              </TooltipContent>
            </Tooltip>

            <LanguageSwitcher />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={t('tooltips.toggleTheme')}
                  className="relative"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('tooltips.toggleTheme')}</p>
              </TooltipContent>
            </Tooltip>

            <UserMenu />
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
}
