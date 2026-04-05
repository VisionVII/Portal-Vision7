import React, { useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarDays } from 'lucide-react';

function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getPortugueseHolidays(year: number): Array<{ date: Date; name: string }> {
  const holidays: Array<{ date: Date; name: string }> = [
    { date: new Date(year, 0, 1), name: 'Ano Novo' },
    { date: new Date(year, 3, 25), name: 'Dia da Liberdade' },
    { date: new Date(year, 4, 1), name: 'Dia do Trabalhador' },
    { date: new Date(year, 5, 10), name: 'Dia de Portugal' },
    { date: new Date(year, 7, 15), name: 'Assunção de Nossa Senhora' },
    { date: new Date(year, 9, 5), name: 'Implantação da República' },
    { date: new Date(year, 10, 1), name: 'Dia de Todos os Santos' },
    { date: new Date(year, 11, 1), name: 'Restauração da Independência' },
    { date: new Date(year, 11, 8), name: 'Imaculada Conceição' },
    { date: new Date(year, 11, 25), name: 'Natal' },
  ];

  const easter = calculateEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  holidays.push({ date: goodFriday, name: 'Sexta-feira Santa' });

  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);
  holidays.push({ date: corpusChristi, name: 'Corpo de Deus' });

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface CalendarPopoverProps {
  localDateLabel: string;
  className?: string;
}

const CalendarPopover: React.FC<CalendarPopoverProps> = ({ localDateLabel, className }) => {
  const [month, setMonth] = useState(new Date());
  const year = month.getFullYear();

  const holidays = useMemo(() => getPortugueseHolidays(year), [year]);

  const holidayDates = useMemo(() => holidays.map((h) => h.date), [holidays]);

  const visibleHolidays = useMemo(
    () => holidays.filter((h) => h.date.getMonth() === month.getMonth()),
    [holidays, month],
  );

  const today = new Date();

  const getHolidayName = (date: Date): string | null => {
    const found = holidays.find((h) => isSameDay(h.date, date));
    return found?.name ?? null;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          <CalendarDays className="h-3.5 w-3.5 text-primary-600" />
          <span>{localDateLabel}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px] gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CalendarDays className="h-5 w-5 text-primary-600" />
            Calendário — Feriados PT
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center px-3 pb-1 pt-2">
          <Calendar
            mode="single"
            selected={today}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ holiday: holidayDates }}
            modifiersClassNames={{
              holiday:
                'ring-2 ring-red-400 dark:ring-red-500 bg-red-50 text-red-700 font-bold dark:bg-red-950/50 dark:text-red-300',
            }}
          />
        </div>

        <div className="border-t border-border px-5 pb-5 pt-3">
          {visibleHolidays.length > 0 ? (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Feriados — {month.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </p>
              <ul className="space-y-1.5">
                {visibleHolidays.map((h) => {
                  const isPast = h.date < today && !isSameDay(h.date, today);
                  const isToday = isSameDay(h.date, today);
                  return (
                    <li
                      key={h.name}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                        isToday
                          ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                          : isPast
                            ? 'text-muted-foreground line-through opacity-60'
                            : 'text-foreground'
                      }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                          isToday ? 'bg-primary-600' : isPast ? 'bg-muted-foreground/40' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium tabular-nums">
                        {String(h.date.getDate()).padStart(2, '0')}/{String(h.date.getMonth() + 1).padStart(2, '0')}
                      </span>
                      <span className="text-muted-foreground">—</span>
                      <span>{h.name}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              Sem feriados em {month.toLocaleDateString('pt-PT', { month: 'long' })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { CalendarPopover };
export default CalendarPopover;
