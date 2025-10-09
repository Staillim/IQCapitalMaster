'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal' | 'red' | 'indigo';
  icon?: ReactNode;
  hoverable?: boolean;
}

const gradients = {
  blue: 'from-blue-500/10 via-cyan-500/5 to-blue-600/10',
  purple: 'from-purple-500/10 via-pink-500/5 to-purple-600/10',
  green: 'from-green-500/10 via-emerald-500/5 to-green-600/10',
  orange: 'from-orange-500/10 via-amber-500/5 to-orange-600/10',
  pink: 'from-pink-500/10 via-rose-500/5 to-pink-600/10',
  teal: 'from-teal-500/10 via-cyan-500/5 to-teal-600/10',
  red: 'from-red-500/10 via-rose-500/5 to-red-600/10',
  indigo: 'from-indigo-500/10 via-violet-500/5 to-indigo-600/10',
};

const orbColors = {
  blue: 'bg-blue-500/20',
  purple: 'bg-purple-500/20',
  green: 'bg-green-500/20',
  orange: 'bg-orange-500/20',
  pink: 'bg-pink-500/20',
  teal: 'bg-teal-500/20',
  red: 'bg-red-500/20',
  indigo: 'bg-indigo-500/20',
};

export function AnimatedCard({
  title,
  description,
  children,
  className,
  gradient = 'blue',
  icon,
  hoverable = true,
}: AnimatedCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-500',
        'border-2 border-muted/50',
        'bg-gradient-to-br',
        gradients[gradient],
        hoverable && 'hover:shadow-2xl hover:scale-[1.02] hover:-rotate-1',
        hoverable && 'hover:border-primary/30',
        'group',
        className
      )}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer" />
      </div>

      {/* Floating Orbs */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 animate-pulse-slow">
        <div className={cn('w-full h-full rounded-full', orbColors[gradient])} />
      </div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 animate-pulse-slower">
        <div className={cn('w-full h-full rounded-full', orbColors[gradient])} />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-primary/40 animate-float" />
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 rounded-full bg-primary/30 animate-float-delay-1" />
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 rounded-full bg-primary/40 animate-float-delay-2" />
        <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 rounded-full bg-primary/30 animate-float-delay-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {(title || icon) && (
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors duration-300">
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <CardDescription className="text-xs mt-0.5">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(!title && !icon && 'pt-6')}>
          {children}
        </CardContent>
      </div>

      {/* Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
}
