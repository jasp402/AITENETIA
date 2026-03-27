'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, CheckCircle2, Cpu, Dock, KeyRound, LockKeyhole, ScanLine, Sparkles, TriangleAlert } from 'lucide-react';

export type ActivationPersistence = {
  status: 'locked' | 'validated';
  maskedKey?: string;
  customerName?: string;
  validatedAt?: string;
  survey?: ActivationSurveyAnswers;
  completedAt?: string;
};

export type ActivationSurveyAnswers = {
  agentsMode: 'guided' | 'hybrid' | 'autonomous';
  a2aMode: 'strict' | 'balanced' | 'aggressive';
  aiFocus: 'quality' | 'balanced' | 'speed';
  modelPreference: 'bring-your-own' | 'mixed' | 'centralized';
};

export type SystemReadiness = {
  activation: {
    mode: 'webhook' | 'env_fallback';
    webhookConfigured: boolean;
    hint: string;
  };
  docker: {
    available: boolean;
    blocking: boolean;
    message: string;
  };
  env: {
    configuredCount: number;
    total: number;
    providers: Array<{
      key: string;
      label: string;
      configured: boolean;
      required: boolean;
      description: string;
    }>;
  };
};

type ActivationGateProps = {
  isOpen: boolean;
  readiness: SystemReadiness | null;
  persistence: ActivationPersistence | null;
  onValidated: (state: ActivationPersistence) => void | Promise<void>;
  onCompleted: (survey: ActivationSurveyAnswers) => void | Promise<void>;
};

type Step = 'activation' | 'welcome' | 'survey' | 'requirements';

const defaultSurvey: ActivationSurveyAnswers = {
  agentsMode: 'hybrid',
  a2aMode: 'balanced',
  aiFocus: 'balanced',
  modelPreference: 'bring-your-own'
};

function getApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4001`;
  }
  return 'http://localhost:4001';
}

const maskActivationKey = (value: string) => {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
};

export function ActivationGate({
  isOpen,
  readiness,
  persistence,
  onValidated,
  onCompleted
}: ActivationGateProps) {
  const API_URL = useMemo(() => getApiUrl(), []);
  const [step, setStep] = useState<Step>('activation');
  const [activationKey, setActivationKey] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [completionState, setCompletionState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [survey, setSurvey] = useState<ActivationSurveyAnswers>(defaultSurvey);

  useEffect(() => {
    if (!isOpen) return;

    if (persistence?.status === 'validated' && persistence.completedAt) {
      setStep('requirements');
      return;
    }

    if (persistence?.status === 'validated' && !persistence.completedAt) {
      setStep('welcome');
      if (persistence.survey) setSurvey(persistence.survey);
      return;
    }

    setStep('activation');
  }, [isOpen, persistence]);

  const configuredProviders = readiness?.env.providers.filter((provider) => provider.configured) ?? [];
  const missingProviders = readiness?.env.providers.filter((provider) => !provider.configured) ?? [];
  const dockerBlocking = Boolean(readiness && !readiness.docker.available && readiness.docker.blocking);
  const canFinish = Boolean(persistence?.status === 'validated' && !dockerBlocking);

  const surveySummary = useMemo(
    () => [
      { label: 'Agentes', value: survey.agentsMode },
      { label: 'A2A', value: survey.a2aMode },
      { label: 'IA', value: survey.aiFocus },
      { label: 'Modelos', value: survey.modelPreference }
    ],
    [survey]
  );

  const handleValidate = async () => {
    const cleanKey = activationKey.trim();
    if (!cleanKey) {
      setValidationState('error');
      setValidationMessage('Ingresa una llave de activacion valida.');
      return;
    }

    setValidationState('loading');
    setValidationMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/system/activation/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activationKey: cleanKey })
      });

      const payload = await response.json().catch(() => null) as
        | { valid?: boolean; message?: string; customerName?: string }
        | null;

      if (!response.ok || !payload?.valid) {
        throw new Error(payload?.message || 'No se pudo validar la llave de activacion.');
      }

      const nextState: ActivationPersistence = {
        status: 'validated',
        maskedKey: maskActivationKey(cleanKey),
        customerName: payload.customerName || 'Operator',
        validatedAt: new Date().toISOString()
      };

      await onValidated(nextState);
      setValidationState('idle');
      setValidationMessage(payload.message || 'Llave validada correctamente.');
      setStep('welcome');
    } catch (error) {
      setValidationState('error');
      setValidationMessage(error instanceof Error ? error.message : 'No se pudo validar la llave.');
    }
  };

  const handleCompleteRequirements = async () => {
    try {
      setCompletionState('loading');
      setValidationMessage(null);
      await onCompleted(survey);
      setCompletionState('idle');
    } catch (error) {
      setCompletionState('error');
      setValidationMessage(error instanceof Error ? error.message : 'No se pudo finalizar la activacion.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#050507]/92 px-4 py-5 backdrop-blur-2xl sm:px-6 sm:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.12),transparent_24%)]" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0b12]/95 shadow-[0_40px_140px_rgba(0,0,0,0.55)]"
      >
        <div className="grid max-h-[min(88vh,860px)] overflow-y-auto lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-white/8 bg-white/[0.03] p-5 lg:border-b-0 lg:border-r lg:p-6">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
              <LockKeyhole size={14} />
              Security Activation
            </div>

            <div className="mt-6 space-y-3">
              <StepBadge active={step === 'activation'} index="01" title="Activation Key" description="Sin licencia valida el sistema permanece bloqueado." />
              <StepBadge active={step === 'welcome'} index="02" title="Welcome" description="Confirmacion de acceso y primer handshake del operador." />
              <StepBadge active={step === 'survey'} index="03" title="Quick Survey" description="Preferencias iniciales de agentes, A2A, IA y modelos." />
              <StepBadge active={step === 'requirements'} index="04" title="Runtime Check" description="Docker obligatorio y llaves IA detectadas desde .env." />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                <ScanLine size={12} />
                Estado del sistema
              </div>
              <div className="mt-5 space-y-3">
                <StatusRow
                  icon={<KeyRound size={13} />}
                  label="Licencia"
                  tone={persistence?.status === 'validated' ? 'ok' : 'warn'}
                  value={persistence?.status === 'validated' ? persistence.maskedKey || 'Validada' : 'Pendiente'}
                />
                <StatusRow
                  icon={<Dock size={13} />}
                  label="Docker"
                  tone={readiness?.docker.available ? 'ok' : 'error'}
                  value={readiness?.docker.available ? 'Disponible' : 'No detectado'}
                />
                <StatusRow
                  icon={<Bot size={13} />}
                  label="Llaves IA"
                  tone={configuredProviders.length > 0 ? 'ok' : 'warn'}
                  value={readiness ? `${configuredProviders.length}/${readiness.env.total} configuradas` : 'Cargando'}
                />
              </div>
            </div>
          </aside>

          <section className="flex flex-col p-5 lg:p-6 xl:p-7">
            <AnimatePresence mode="wait">
              {step === 'activation' && (
                <motion.div key="activation" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="flex h-full flex-col">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.26em] text-primary/70">
                      <Sparkles size={14} />
                      Activation Required
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-white xl:text-[2.55rem]">
                      Este workspace no puede operar sin una llave de activacion valida.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/55 sm:text-[15px]">
                      El primer paso es validar la licencia maestra. Luego se desbloquea el onboarding inicial y el sistema queda listo para revisar Docker y las llaves de modelos.
                    </p>
                  </div>

                  <div className="mt-8 max-w-2xl rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Llave de activacion</label>
                    <input
                      value={activationKey}
                      onChange={(event) => setActivationKey(event.target.value)}
                      placeholder="Pega aqui tu activation key"
                      className="mt-4 h-14 w-full rounded-2xl border border-white/10 bg-[#101019] px-5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary/35"
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-white/35">
                        Modo de validacion: {readiness?.activation.mode === 'webhook' ? 'Webhook remoto' : 'Fallback local de desarrollo'}
                      </div>
                      <button
                        type="button"
                        onClick={handleValidate}
                        disabled={validationState === 'loading'}
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/12 px-5 text-[11px] font-black uppercase tracking-[0.2em] text-primary transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {validationState === 'loading' ? 'Validando' : 'Validar llave'}
                      </button>
                    </div>

                    {validationMessage && (
                      <div
                        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                          validationState === 'error'
                            ? 'border-red-500/20 bg-red-500/10 text-red-300'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {validationMessage}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'welcome' && (
                <motion.div key="welcome" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="flex h-full flex-col">
                  <div>
                    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">
                      <CheckCircle2 size={14} />
                      Access Granted
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-white xl:text-[2.55rem]">
                      Bienvenido, {persistence?.customerName || 'operator'}.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                      La licencia ya fue aceptada. Antes de soltar la flota, definamos tu perfil operativo para que el sistema arranque con un sesgo correcto en agentes, A2A, IA y modelos.
                    </p>

                    <div className="mt-7 grid gap-4 lg:grid-cols-3">
                      <SummaryCard
                        label="Licencia"
                        value={persistence?.status === 'validated' ? persistence.maskedKey || 'Validada' : 'Pendiente'}
                        helper="Persistida en este browser."
                      />
                      <SummaryCard label="Modo" value={readiness?.activation.mode === 'webhook' ? 'Webhook' : 'Fallback'} helper={readiness?.activation.hint || 'Sin detalle'} />
                      <SummaryCard label="Docker" value={readiness?.docker.available ? 'Ready' : 'Missing'} helper={readiness?.docker.message || 'Comprobando'} />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end border-t border-white/8 pt-5">
                    <button
                      type="button"
                      onClick={() => setStep('survey')}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/12 bg-white text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-white/90"
                    >
                      Continuar con encuesta
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'survey' && (
                <motion.div key="survey" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="flex h-full flex-col">
                  <div>
                    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.26em] text-white/40">
                      <Cpu size={14} />
                      Quick Survey
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-white xl:text-[2.55rem]">
                      Define la postura inicial del sistema.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55 sm:text-[15px]">
                      Esta encuesta no reemplaza configuraciones avanzadas, pero si nos da una linea base para como quieres que los especialistas coordinen, cuanto riesgo toleras en A2A y que priorizas en modelos.
                    </p>
                  </div>

                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <ChoiceGroup
                      label="Agentes"
                      value={survey.agentsMode}
                      onChange={(value) => setSurvey((current) => ({ ...current, agentsMode: value as ActivationSurveyAnswers['agentsMode'] }))}
                      options={[
                        ['guided', 'Guiado', 'Mantener al usuario cerca del circuito de decision.'],
                        ['hybrid', 'Hibrido', 'Balancear autonomia con checkpoints humanos.'],
                        ['autonomous', 'Autonomo', 'Maximizar ejecucion delegada y velocidad.']
                      ]}
                    />
                    <ChoiceGroup
                      label="A2A"
                      value={survey.a2aMode}
                      onChange={(value) => setSurvey((current) => ({ ...current, a2aMode: value as ActivationSurveyAnswers['a2aMode'] }))}
                      options={[
                        ['strict', 'Estricto', 'Pedir menos handoffs y mas criterio humano.'],
                        ['balanced', 'Balanceado', 'Permitir coordinacion controlada entre especialistas.'],
                        ['aggressive', 'Agresivo', 'Favorecer handoffs y colaboracion continua.']
                      ]}
                    />
                    <ChoiceGroup
                      label="IA"
                      value={survey.aiFocus}
                      onChange={(value) => setSurvey((current) => ({ ...current, aiFocus: value as ActivationSurveyAnswers['aiFocus'] }))}
                      options={[
                        ['quality', 'Calidad', 'Priorizar profundidad y respuesta robusta.'],
                        ['balanced', 'Balance', 'Equilibrar costo, velocidad y precision.'],
                        ['speed', 'Velocidad', 'Empujar menor latencia y mayor throughput.']
                      ]}
                    />
                    <ChoiceGroup
                      label="Modelos"
                      value={survey.modelPreference}
                      onChange={(value) => setSurvey((current) => ({ ...current, modelPreference: value as ActivationSurveyAnswers['modelPreference'] }))}
                      options={[
                        ['bring-your-own', 'BYOK', 'Cada usuario controla sus llaves en .env.'],
                        ['mixed', 'Mixto', 'Combinar llaves del usuario y configuracion central.'],
                        ['centralized', 'Centralizado', 'Operar con un stack mas estandarizado.']
                      ]}
                    />
                  </div>

                  <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-black/25 p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Resumen preliminar</div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {surveySummary.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">{item.label}</div>
                          <div className="mt-1 text-sm font-black uppercase text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep('welcome')}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 transition-all hover:bg-white/[0.06]"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('requirements')}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/12 px-5 text-[11px] font-black uppercase tracking-[0.2em] text-primary transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'requirements' && (
                <motion.div key="requirements" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="flex h-full min-w-0 flex-col">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.26em] text-white/40">
                      <Dock size={14} />
                      Runtime Requirements
                    </div>
                    <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-white xl:text-[2.55rem]">
                      Docker y llaves de modelos antes de operar.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55 sm:text-[15px]">
                      La licencia ya es valida. Ahora el sistema verifica prerequisitos operativos. Docker es bloqueante. Las llaves de IA deben colocarse en el archivo <code className="rounded bg-white/8 px-1.5 py-0.5 text-[0.9em] text-white/80">.env</code> del backend para habilitar modelos reales.
                    </p>
                  </div>

                  {dockerBlocking && (
                    <div className="mt-6 rounded-[1.5rem] border border-red-500/25 bg-red-500/12 p-5 text-red-200">
                      <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em]">
                        <TriangleAlert size={14} />
                        No podemos avanzar sin Docker
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-red-100/85">
                        {readiness?.docker.message || 'Docker no esta disponible en este host.'} Instalala o enciendelo antes de continuar con el runtime de proyectos.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
                    <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-black/25 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Checklist .env</div>
                          <div className="mt-2 text-lg font-black text-white">Llaves IA detectadas</div>
                        </div>
                        <div className="self-start rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left sm:text-right">
                          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">Configuradas</div>
                          <div className="mt-1 text-lg font-black text-white">
                            {readiness ? `${readiness.env.configuredCount}/${readiness.env.total}` : '...'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {readiness?.env.providers.map((provider) => (
                          <div
                            key={provider.key}
                            className={`min-w-0 rounded-[1.35rem] border px-4 py-4 ${
                              provider.configured
                                ? 'border-emerald-500/15 bg-emerald-500/[0.06]'
                                : 'border-white/8 bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="break-words text-sm font-black text-white">{provider.label}</div>
                                <div className="mt-1 break-all text-[11px] leading-relaxed text-white/40">{provider.key}</div>
                              </div>
                              <div
                                className={`self-start rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                  provider.configured ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.06] text-white/40'
                                }`}
                              >
                                {provider.configured ? 'Detectada' : 'Pendiente'}
                              </div>
                            </div>
                            <div className="mt-3 break-words text-sm leading-relaxed text-white/55">{provider.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-5">
                      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Encuesta</div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                          {surveySummary.map((item) => (
                            <div key={item.label} className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{item.label}</span>
                              <span className="break-words text-sm font-black uppercase text-white sm:text-right">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">.env requerido</div>
                        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl border border-white/8 bg-black/25 p-4 text-xs leading-6 text-white/65">
{`OPENAI_API_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPEN_ROUTER_API_KEY=...`}
                        </pre>
                        {missingProviders.length > 0 && (
                          <p className="mt-4 text-sm leading-relaxed text-white/50">
                            Sin estas llaves no habra ejecucion real de modelos. La UI puede abrir, pero los especialistas no podran producir trabajo util contra proveedores externos.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep('survey')}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 transition-all hover:bg-white/[0.06]"
                    >
                      Ajustar encuesta
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteRequirements}
                      disabled={!canFinish || completionState === 'loading'}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/12 bg-white px-5 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
                    >
                      {dockerBlocking ? 'Docker requerido' : completionState === 'loading' ? 'Aplicando acceso' : 'Entrar al dashboard'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </motion.div>
    </div>
  );
}

function StepBadge({
  active,
  index,
  title,
  description
}: {
  active: boolean;
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className={`min-w-0 rounded-[1.6rem] border p-3.5 transition-all ${active ? 'border-white/16 bg-white/[0.08]' : 'border-white/8 bg-black/20'}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25">{index}</div>
      <div className="mt-2 break-words text-[13px] font-black uppercase text-white">{title}</div>
      <div className="mt-1.5 break-words text-[13px] leading-6 text-white/45">{description}</div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'error';
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-300'
      : tone === 'error'
        ? 'border-red-500/15 bg-red-500/10 text-red-300'
        : 'border-amber-500/15 bg-amber-500/10 text-amber-300';

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/8 bg-black/25 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3 text-[13px] text-white/75">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${toneClass}`}>{icon}</span>
        <span className="break-words">{label}</span>
      </div>
      <div className="max-w-full break-words text-left text-[10px] font-black uppercase tracking-[0.18em] text-white/45 sm:max-w-[10rem] sm:text-right">{value}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">{label}</div>
      <div className="mt-2 break-words text-[1.6rem] font-black leading-none text-white">{value}</div>
      <div className="mt-2 break-words text-[13px] leading-6 text-white/45">{helper}</div>
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string, string]>;
}) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-black/25 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">{label}</div>
      <div className="mt-4 space-y-3">
        {options.map(([optionValue, optionLabel, description]) => {
          const active = value === optionValue;
          return (
            <button
              type="button"
              key={optionValue}
              onClick={() => onChange(optionValue)}
              className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
                active ? 'border-primary/30 bg-primary/10 text-white' : 'border-white/8 bg-white/[0.03] text-white/70 hover:border-white/15 hover:bg-white/[0.05]'
              }`}
            >
              <div className="text-[13px] font-black uppercase">{optionLabel}</div>
              <div className="mt-1.5 text-[13px] leading-6 text-white/50">{description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
