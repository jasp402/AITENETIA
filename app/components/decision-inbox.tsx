'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquareQuote } from 'lucide-react';

interface DecisionRequest {
  id: string;
  task_id?: string;
  question: string;
  context?: string;
  options?: string[];
  recommended_option?: string | null;
  impact_if_delayed?: string | null;
  agent_name?: string;
  task_title?: string;
}

export function DecisionInbox({
  requests,
  onAnswer,
  highlightedRequestId,
}: {
  requests: DecisionRequest[];
  onAnswer: (requestId: string, answer: string) => void;
  highlightedRequestId?: string | null;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-6">
        <div className="flex items-center gap-3 text-white/35">
          <CheckCircle2 size={16} className="text-emerald-300" />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">No open decisions</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[2rem] border border-fuchsia-400/10 bg-fuchsia-400/5 p-6">
      <div className="flex items-center gap-3">
        <MessageSquareQuote size={16} className="text-fuchsia-300" />
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-200">Decision Inbox</div>
      </div>

      {requests.map((request) => (
        <DecisionRequestCard
          key={request.id}
          request={request}
          highlighted={highlightedRequestId === request.id}
          onAnswer={(answer) => onAnswer(request.id, answer)}
        />
      ))}
    </div>
  );
}

function DecisionRequestCard({
  request,
  highlighted,
  onAnswer,
}: {
  request: DecisionRequest;
  highlighted: boolean;
  onAnswer: (answer: string) => void;
}) {
  const [selectedOption, setSelectedOption] = useState(request.recommended_option || '');
  const [note, setNote] = useState('');
  const hasOptions = (request.options || []).length > 0;

  const composedAnswer = useMemo(() => {
    const cleanOption = selectedOption.trim();
    const cleanNote = note.trim();

    if (cleanOption && cleanNote) {
      return `${cleanOption}\n\nContexto adicional del usuario:\n${cleanNote}`;
    }

    return cleanOption || cleanNote;
  }, [selectedOption, note]);

  return (
    <div
      className={`rounded-3xl border p-5 transition-all ${
        highlighted
          ? 'border-fuchsia-300/35 bg-fuchsia-300/10 shadow-[0_0_0_1px_rgba(244,114,182,0.18)]'
          : 'border-white/8 bg-black/20'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            {request.agent_name || 'Agent'} · {request.task_title || 'Task'}
          </div>
          <div className="mt-2 text-base font-black text-white">{request.question}</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
          <AlertTriangle size={12} />
          Awaiting User
        </div>
      </div>

      {request.context ? <p className="mt-3 text-sm leading-relaxed text-white/55">{request.context}</p> : null}
      {request.impact_if_delayed ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/35">Impact: {request.impact_if_delayed}</p> : null}

      {hasOptions ? (
        <div className="mt-4">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Quick choices</div>
          <div className="flex flex-wrap gap-3">
            {(request.options || []).map((option) => {
              const selected = selectedOption === option;
              const recommended = request.recommended_option === option;
              return (
                <button
                  key={option}
                  onClick={() => setSelectedOption(option)}
                  className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    selected
                      ? 'border-primary/35 bg-primary/12 text-primary'
                      : recommended
                        ? 'border-primary/20 bg-primary/8 text-primary/85'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20'
                  }`}
                >
                  {option}
                  {recommended ? ' · recomendado' : ''}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
          {hasOptions ? 'Optional note' : 'Your answer'}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={hasOptions ? 'Agrega contexto, restricciones o una aclaracion para el agente.' : 'Escribe la respuesta que el agente necesita para continuar.'}
          className="min-h-[108px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/35 focus:bg-white/[0.05]"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-white/40">
          {hasOptions
            ? 'Puedes responder con una opcion rapida, una nota libre o ambas.'
            : 'Esta solicitud requiere respuesta libre del usuario.'}
        </div>
        <button
          type="button"
          disabled={!composedAnswer.trim()}
          onClick={() => onAnswer(composedAnswer)}
          className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-fuchsia-100 transition-all hover:border-fuchsia-300/40 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/30"
        >
          Enviar al agente
        </button>
      </div>
    </div>
  );
}
