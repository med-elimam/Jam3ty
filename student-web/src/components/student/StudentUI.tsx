import type { ReactNode } from 'react';
import { Link } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Inbox,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function getResponseData<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const data = (value as { data?: unknown } | undefined)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export function chooseLocalized(
  item: Record<string, unknown> | null | undefined,
  lang: 'ar' | 'fr',
  fallback = '',
) {
  if (!item) return fallback;
  const ar = item.nameAr ?? item.titleAr;
  const fr = item.nameFr ?? item.titleFr;
  const base = item.name ?? item.title;
  const value = lang === 'ar' ? ar ?? base : fr ?? base ?? ar;
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function formatDate(value?: string | null, lang: 'ar' | 'fr' = 'ar') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MR' : 'fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTime(value?: string | null) {
  return value ? String(value).slice(0, 5) : '—';
}

export function interpolate(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('student-page-shell', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'navy',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'navy' | 'gold' | 'green' | 'red';
}) {
  const toneClass = {
    navy: 'bg-primary/10 text-primary',
    gold: 'bg-accent/30 text-amber-800',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <Card className="student-card gap-3 rounded-xl p-4 shadow-none">
      <div className={cn('flex size-10 items-center justify-center rounded-lg', toneClass)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  to,
  viewLabel,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  to?: string;
  viewLabel?: string;
}) {
  return (
    <Card className="student-card gap-4 rounded-xl p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="size-5" />
          </span>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        {to && viewLabel ? (
          <Link href={to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
            {viewLabel}
            <ArrowLeft className="size-4 rtl:block ltr:hidden" />
            <ArrowRight className="size-4 rtl:hidden" />
          </Link>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl bg-secondary/60 px-6 py-10 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-card text-primary">
        <Icon className="size-8" />
      </div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {body ? <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={message ?? 'تعذر تحميل البيانات'}
      body="تحقق من الاتصال ثم حاول تحديث الصفحة. إن استمرت المشكلة فقد تكون الخدمة غير متاحة حالياً."
    />
  );
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <PageShell>
      <div className="student-skeleton-header">
        <div className="student-skeleton-line student-skeleton-title" />
        <div className="student-skeleton-line student-skeleton-copy" />
      </div>
      <div className="student-skeleton-grid">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="student-skeleton-card student-card">
            <div className="student-skeleton-icon" />
            <div className="student-skeleton-line student-skeleton-card-title" />
            <div className="student-skeleton-line" />
            <div className="student-skeleton-line student-skeleton-short" />
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export const studentIcons = {
  announcements: Bell,
  assignments: CheckCircle2,
  courses: BookOpen,
  exams: ShieldCheck,
  files: FileText,
  search: Search,
  timetable: CalendarDays,
  time: Clock3,
  university: GraduationCap,
};
