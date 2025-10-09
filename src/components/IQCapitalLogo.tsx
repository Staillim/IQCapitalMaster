import { Banknote } from 'lucide-react';

export function IQCapitalLogo() {
  return (
    <div className="flex items-center justify-center" aria-label="IQCapital Master">
      <Banknote className="h-8 w-8 text-primary" />
      <span className="ml-2 text-2xl font-bold text-primary font-headline">
        IQCapital
      </span>
    </div>
  );
}
