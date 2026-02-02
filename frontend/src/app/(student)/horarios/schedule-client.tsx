'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Sparkles, Lightbulb, Sun, Moon } from 'lucide-react';

import type { MeScheduleTodayResponse, MeScheduleWeekResponse, MeScheduleClassInfo } from '@/types/portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type SchedulePageClientProps = {
  today: MeScheduleTodayResponse;
  week: MeScheduleWeekResponse;
};

const dayNames: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function TipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full border-secondary/30 bg-secondary/10 text-secondary shadow-[0_0_12px_rgba(37,185,121,0.25)] hover:bg-secondary/20 hover:text-secondary"
        >
          <Lightbulb className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-secondary" />
            Dicas sobre Horários
          </DialogTitle>
          <DialogDescription>
            Informações importantes sobre suas aulas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
            <h4 className="font-medium text-secondary">📍 Localização</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Confira a sala antes de sair de casa. Algumas aulas podem ter mudança de local.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="font-medium text-primary">⏰ Tolerância</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              A tolerância para atraso é de <strong>15 minutos</strong>. Após isso, será registrada falta.
            </p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <h4 className="font-medium text-warning">❌ Cancelamentos</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Aulas canceladas aparecem em destaque. Fique atento às notificações de reposição.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function ClassCard({ classInfo, showDate = false }: { classInfo: MeScheduleClassInfo; showDate?: boolean }) {
  const startHour = parseInt(classInfo.start_time.slice(0, 2));
  const isMorning = startHour < 12;
  const isAfternoon = startHour >= 12 && startHour < 18;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md overflow-hidden',
      classInfo.is_canceled && 'opacity-60 border-destructive/30'
    )}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Time indicator bar */}
          <div className={cn(
            'w-1.5 shrink-0',
            isMorning ? 'bg-secondary' : isAfternoon ? 'bg-warning' : 'bg-primary'
          )} />
          
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{classInfo.subject_name}</span>
                  {classInfo.is_canceled && (
                    <Badge variant="destructive" className="shrink-0">Cancelada</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{classInfo.subject_code}</p>
              </div>
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="gap-1.5 font-mono">
                <Clock className="size-3.5" />
                {formatTime(classInfo.start_time)} – {formatTime(classInfo.end_time)}
              </Badge>
              
              {classInfo.room && (
                <Badge variant="outline" className="gap-1.5">
                  <MapPin className="size-3.5" />
                  {classInfo.room}
                </Badge>
              )}
              
              {showDate && (
                <Badge variant="outline" className="gap-1.5">
                  <Calendar className="size-3.5" />
                  {new Date(classInfo.session_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </Badge>
              )}
              
              <Badge 
                variant="outline" 
                className={cn(
                  'gap-1.5 ml-auto',
                  isMorning ? 'border-secondary/30 bg-secondary/10 text-secondary' :
                  isAfternoon ? 'border-warning/30 bg-warning/10 text-warning' :
                  'border-primary/30 bg-primary/10 text-primary'
                )}
              >
                {isMorning ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                {isMorning ? 'Manhã' : isAfternoon ? 'Tarde' : 'Noite'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayView({ data }: { data: MeScheduleTodayResponse }) {
  if (data.classes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary/10">
            <Calendar className="size-8 text-secondary" />
          </div>
          <p className="text-lg font-medium">Nenhuma aula hoje!</p>
          <p className="text-sm text-muted-foreground mt-1">Aproveite para estudar ou descansar 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.classes.map((classInfo) => (
        <ClassCard key={classInfo.session_id} classInfo={classInfo} />
      ))}
    </div>
  );
}

function WeekView({ data }: { data: MeScheduleWeekResponse }) {
  const hasClasses = data.total_classes > 0;

  if (!hasClasses) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary/10">
            <Calendar className="size-8 text-secondary" />
          </div>
          <p className="text-lg font-medium">Semana livre!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(data.week_start + 'T00:00:00').toLocaleDateString('pt-BR')} –{' '}
            {new Date(data.week_end + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {dayOrder.map((day) => {
        const classes = data.days[day];
        if (!classes || classes.length === 0) return null;

        return (
          <div key={day} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{dayNames[day]}</h3>
              <Badge 
                variant="outline" 
                className="border-primary/30 bg-primary/10 text-primary"
              >
                {classes.length} aula{classes.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              {classes.map((classInfo) => (
                <ClassCard key={classInfo.session_id} classInfo={classInfo} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SchedulePageClient({ today, week }: SchedulePageClientProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm">
        <Calendar className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-secondary opacity-5" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Grade de Aulas</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Horários</h1>
            <p className="text-sm text-muted-foreground capitalize">{formatDate(today.date)}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                'h-10 gap-2 px-4 font-semibold shadow-sm backdrop-blur-sm',
                today.total_classes > 0 
                  ? 'border-primary/30 bg-primary/10 text-primary' 
                  : 'border-secondary/30 bg-secondary/10 text-secondary'
              )}
            >
              <Calendar className="size-4" />
              {today.total_classes} aula{today.total_classes !== 1 ? 's' : ''} hoje
            </Badge>
            <TipsDialog />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'week')}>
        <TabsList className="grid w-full max-w-sm grid-cols-2 h-12">
          <TabsTrigger value="today" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sun className="size-4" />
            Hoje
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="size-4" />
            Semana
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <TodayView data={today} />
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          <Card className="mb-4 overflow-hidden">
            <CardHeader className="py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Semana Atual</CardTitle>
                    <CardDescription>
                      {new Date(week.week_start + 'T00:00:00').toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      –{' '}
                      {new Date(week.week_end + 'T00:00:00').toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-secondary/30 bg-secondary/10 text-secondary font-semibold">
                  {week.total_classes} aula{week.total_classes !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
          </Card>
          <WeekView data={week} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
