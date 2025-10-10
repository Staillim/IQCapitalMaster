'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  gradient?: 'light' | 'medium' | 'vibrant' | 'vivid' | 'deep' | 'intense';
  icon?: ReactNode;
  hoverable?: boolean;
}

const gradients = {
  light: 'from-blue-50 via-blue-100 to-blue-200',
  medium: 'from-blue-100 via-blue-200 to-blue-300',
  vibrant: 'from-blue-200 via-blue-300 to-blue-400',
  vivid: 'from-blue-300 via-blue-400 to-blue-500',
  deep: 'from-blue-400 via-blue-500 to-blue-600',
  intense: 'from-blue-500 via-blue-600 to-blue-700',
};

const orbColors = {
  light: 'bg-blue-400/60',
  medium: 'bg-blue-500/65',
  vibrant: 'bg-blue-600/70',
  vivid: 'bg-blue-700/75',
  deep: 'bg-blue-800/80',
  intense: 'bg-blue-900/85',
};

export function AnimatedCard({
  title,
  description,
  children,
  className,
  gradient = 'medium',
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
        hoverable && 'hover:border-blue-500/60',
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
        <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-blue-500/80 animate-float" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-blue-600/70 animate-float-delay-1" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-blue-500/80 animate-float-delay-2" />
        <div className="absolute top-3/4 right-1/4 w-2 h-2 rounded-full bg-blue-600/70 animate-float-delay-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {(title || icon) && (
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors duration-300">
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
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
    </Card>
  );
}
