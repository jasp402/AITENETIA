import { initializeDatabase, dbService } from './services/db';
import { initializeServices, getAllServicesStatus, getActiveServices } from './services';
import type { AIService, ChatMessage } from './types';
import { initMemoryCrons, memoryService } from './services/memory';
import { mcpService } from './services/mcpClient';
import { projectManager } from './services/projectManager';
import { orchestratorService } from './core/orchestrator';
import { dockerService } from './services/dockerService';
import { existsSync, mkdirSync } from 'node:fs';
import { SYSTEM_PROMPT_BASE } from './core/prompts';
import crypto from "crypto";
import { getWorkspaceRoot, resolveProjectPath } from './services/systemConfig';

// Asegurar que la base de datos está lista
initializeDatabase();

// Iniciar Servidores MCP
await mcpService.initServers();

// Iniciar Project Manager
projectManager.init();

// Crons de memoria
initMemoryCrons();

// Legacy channel callbacks are disabled in this project.
memoryService.onReminderExecute = () => {};
memoryService.onProactiveNudge = () => {};

await initializeServices();

let currentServiceIndex = 0;
function getNextService() {
  const services = getActiveServices();
  if (services.length === 0) return null;
  const service = services[currentServiceIndex];
  currentServiceIndex = (currentServiceIndex + 1) % services.length;
  return service;
}

const PORT = Number(process.env.PORT) || 4001;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

function getPreviewProjectIdFromReferer(req: Request) {
  const referer = req.headers.get('referer');
  if (!referer) return null;

  try {
    const refererUrl = new URL(referer);
    const match = refererUrl.pathname.match(/^\/preview\/([^/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

async function getProjectPreviewStatus(projectId: string) {
  const project = dbService.getProjectById(projectId);
  if (!project) {
    return { status: 'missing', reachable: false, checkedAt: new Date().toISOString(), reason: 'Project not found' };
  }

  if (project.environment_status !== 'ready') {
    return { status: 'unavailable', reachable: false, checkedAt: new Date().toISOString(), reason: 'Environment not ready' };
  }

  if (project.runtime_status !== 'running') {
    return { status: 'unavailable', reachable: false, checkedAt: new Date().toISOString(), reason: 'Docket is not running' };
  }

  if (!project.preview_url) {
    return { status: 'unavailable', reachable: false, checkedAt: new Date().toISOString(), reason: 'Preview route not assigned' };
  }

  try {
    const response = await fetch(project.preview_url, {
      method: 'GET',
      headers: {
        'accept-encoding': 'identity'
      },
      signal: AbortSignal.timeout(4000)
    });
    const contentType = response.headers.get('content-type') || '';
    const reachable = response.ok && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'));

    if (reachable) {
      const environmentDetails = {
        ...(project.environment_details || {}),
        deliveryReady: true,
        deliveryReason: null
      };
      if (project.status === 'delivery_pending') {
        dbService.updateProject(projectId, {
          status: 'completed',
          environment_details: environmentDetails
        });
      } else {
        dbService.updateProject(projectId, { environment_details: environmentDetails });
      }
    } else if (project.status === 'delivery_pending') {
      dbService.updateProject(projectId, {
        environment_details: {
          ...(project.environment_details || {}),
          deliveryReady: false,
          deliveryReason: `Preview responded with ${response.status}`
        }
      });
    }

    return {
      status: reachable ? 'ready' : 'error',
      reachable,
      checkedAt: new Date().toISOString(),
      reason: reachable ? 'Preview is live' : `Preview responded with ${response.status}`
    };
  } catch (error: any) {
    return {
      status: 'error',
      reachable: false,
      checkedAt: new Date().toISOString(),
      reason: error?.message || 'Unable to reach preview'
    };
  }
}

async function getSystemReadiness() {
  const dockerAvailable = await dockerService.isAvailable();
  const webhookConfigured = true;
  const devFallbackEnabled = process.env.AITENETIA_ALLOW_DEV_ACTIVATION_FALLBACK === "true";
  const providerEnv = [
    { key: "OPENAI_API_KEY", label: "OpenAI", required: false, description: "Modelos GPT y flujos generalistas." },
    { key: "GEMINI_API_KEY", label: "Gemini", required: false, description: "Modelos Gemini para análisis y apoyo multimodelo." },
    { key: "GROQ_API_KEY", label: "Groq", required: false, description: "Inferencia de baja latencia para especialistas rápidos." },
    { key: "OPEN_ROUTER_API_KEY", label: "OpenRouter", required: false, description: "Acceso agregado a múltiples proveedores." },
    { key: "MISTRAL_API_KEY", label: "Mistral", required: false, description: "Modelos Mistral para rutas alternativas." },
    { key: "XAI_API_KEY", label: "xAI", required: false, description: "Grok y variantes compatibles." },
    { key: "CEREBRAS_API_KEY", label: "Cerebras", required: false, description: "Ejecución acelerada por hardware Cerebras." },
    { key: "ZHIPU_API_KEY", label: "GLM", required: false, description: "Proveedor GLM/Zhipu." },
    { key: "MOONSHOT_API_KEY", label: "Moonshot", required: false, description: "Proveedor Kimi/Moonshot." },
    { key: "ANTHROPIC_GLM_API_KEY", label: "Anthropic GLM", required: false, description: "Canal Anthropic-GLM configurado." }
  ];

  const providers = providerEnv.map((provider) => ({
    ...provider,
    configured: Boolean(process.env[provider.key]?.trim())
  }));

  const configuredCount = providers.filter((provider) => provider.configured).length;

  return {
    activation: {
      mode: webhookConfigured ? "webhook" : "env_fallback",
      webhookConfigured,
      hint: webhookConfigured
        ? "La llave se validará por webhook remoto."
        : devFallbackEnabled
          ? "Modo desarrollo: se permite validación local explícita."
          : "No hay webhook configurado ni fallback local habilitado."
    },
    docker: {
      available: dockerAvailable,
      blocking: true,
      message: dockerAvailable
        ? "Docker está disponible para preparar y ejecutar runtimes."
        : "Docker no responde. Sin Docker no se puede preparar ni ejecutar proyectos."
    },
    env: {
      configuredCount,
      total: providers.length,
      providers
    }
  };
}

async function validateActivationKey(activationKey: string) {
  const cleanKey = String(activationKey || "").trim();
  if (!cleanKey) {
    return { valid: false, message: "Activation key is required." };
  }

  const webhookUrl = "https://orchestrator-a2a.vercel.app/api/licenses/validate";
  const webhookSecret = process.env.LICENSE_WEBHOOK_SECRET?.trim();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookSecret ? { "X-License-Webhook-Secret": webhookSecret } : {})
    },
    body: JSON.stringify({
      activationKey: cleanKey,
      product: "AITENETIA",
      source: "mission-control",
      timestamp: new Date().toISOString()
    })
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    return {
      valid: false,
      message: payload?.message || `Activation webhook failed with status ${response.status}.`
    };
  }

  return {
    valid: Boolean(payload?.valid),
    licenseId: payload?.licenseId || payload?.license_id || null,
    customerName: payload?.customerName || payload?.customer?.name || "Operator",
    plan: payload?.plan || null,
    expiresAt: payload?.expiresAt || payload?.expires_at || null,
    message: payload?.message || (payload?.valid ? "Activation approved." : "Activation rejected.")
  };
}

function hashActivationKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getOrCreateSessionSecret() {
  const envSecret = process.env.APP_SESSION_SECRET?.trim();
  if (envSecret) return envSecret;

  const stored = dbService.getSecuritySetting("session_secret");
  if (stored) return stored;

  const generated = crypto.randomBytes(48).toString("hex");
  dbService.setSecuritySetting("session_secret", generated);
  return generated;
}

function getActivationEncryptionKey() {
  return crypto.createHash("sha256").update(getOrCreateSessionSecret()).digest();
}

function encryptActivationKey(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getActivationEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptActivationKey(value: string) {
  const raw = Buffer.from(value, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getActivationEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function persistActivationKey(activationKey: string) {
  dbService.setSecuritySetting("activation_key_encrypted", encryptActivationKey(activationKey));
}

function readPersistedActivationKey() {
  const stored = dbService.getSecuritySetting("activation_key_encrypted");
  if (!stored) return null;
  try {
    return decryptActivationKey(stored);
  } catch {
    return null;
  }
}

function clearPersistedActivationKey() {
  dbService.setSecuritySetting("activation_key_encrypted", "");
}

function parseCookies(req: Request) {
  const header = req.headers.get("cookie") || "";
  return header.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

function createSessionCookie(payload: Record<string, any>) {
  const secret = getOrCreateSessionSecret();
  const body = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const token = `${body}.${signature}`;
  return `ait_activation_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

function clearSessionCookie() {
  return "ait_activation_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}

function readActivationSession(req: Request) {
  const token = parseCookies(req).ait_activation_session;
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto.createHmac("sha256", getOrCreateSessionSecret()).update(body).digest("base64url");
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function buildActivationSessionPayload() {
  const activation = dbService.getActivationState();
  if (!activation || activation.activation_status !== "validated") return null;

  return {
    licenseId: activation.license_id,
    customerName: activation.customer_name || "Operator",
    onboardingCompleted: Boolean(activation.onboarding_completed),
    activatedAt: activation.activated_at,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  };
}

function getActivationClientState(req: Request) {
  const activation = dbService.getActivationState();
  if (!activation || activation.activation_status !== "validated") {
    return {
      status: "locked",
      maskedKey: null,
      customerName: null,
      validatedAt: null,
      survey: null,
      completedAt: null
    };
  }

  const session = readActivationSession(req);
  return {
    status: "validated",
    maskedKey: activation.activation_key_hash ? `${activation.activation_key_hash.slice(0, 4)}****` : "valid",
    customerName: activation.customer_name || session?.customerName || "Operator",
    validatedAt: activation.activated_at,
    survey: activation.survey || null,
    completedAt: activation.onboarding_completed ? activation.last_validated_at || activation.activated_at : null
  };
}

function requireActivation(req: Request) {
  const session = readActivationSession(req);
  const activation = dbService.getActivationState();

  if (!session || !activation || activation.activation_status !== "validated" || !activation.onboarding_completed) {
    return new Response(JSON.stringify({ error: "Activation required" }), {
      status: 401,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      }
    });
  }

  return null;
}

async function proxyToProject(req: Request, projectId: string, targetPath: string) {
  const project = dbService.getProjectById(projectId);
  if (!project?.container_ip || project.runtime_status !== 'running') {
    return new Response("Preview not available", { status: 404 });
  }

  const appPort = Number(project.environment_details?.appPort) || 3000;
  const targetUrl = `http://${project.container_ip}:${appPort}${targetPath}`;

  try {
    const upstreamHeaders = new Headers(req.headers);
    upstreamHeaders.set('accept-encoding', 'identity');
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body
    });

    const headers = new Headers(upstream.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (error: any) {
    return new Response(`Preview proxy error: ${error.message}`, { status: 502 });
  }
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    if (pathname.startsWith('/preview/')) {
      const authError = requireActivation(req);
      if (authError) return authError;
      const parts = pathname.split('/');
      const projectId = parts[2];
      if (!projectId) {
        return new Response("Preview project not found", { status: 404 });
      }
      const restPath = `/${parts.slice(3).join('/')}`;
      const targetPath = restPath === '/' ? url.search || '/' : `${restPath}${url.search}`;
      return proxyToProject(req, projectId, targetPath);
    }

    if (!pathname.startsWith('/api/')) {
      const refererProjectId = getPreviewProjectIdFromReferer(req);
      if (refererProjectId) {
        const authError = requireActivation(req);
        if (authError) return authError;
        return proxyToProject(req, refererProjectId, `${pathname}${url.search}`);
      }
    }

    const isPublicApiRoute =
      (req.method === 'GET' && pathname === '/api/v1/status') ||
      (req.method === 'GET' && pathname === '/api/v1/system/config') ||
      (req.method === 'GET' && pathname === '/api/v1/system/readiness') ||
      (req.method === 'POST' && pathname === '/api/v1/system/activation/validate') ||
      (req.method === 'GET' && pathname === '/api/v1/system/activation/session') ||
      (req.method === 'POST' && pathname === '/api/v1/system/activation/onboarding');

    if (pathname.startsWith('/api/') && !isPublicApiRoute) {
      const authError = requireActivation(req);
      if (authError) return authError;
    }

    // Status
    if (req.method === 'GET' && pathname === '/api/v1/status') {
      return new Response(JSON.stringify(getAllServicesStatus()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fingerprint (Intelligent Polling)
    if (req.method === 'GET' && pathname === '/api/v1/fingerprint') {
      return new Response(JSON.stringify({ fingerprint: dbService.getGlobalFingerprint() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Chat
    if (req.method === 'POST' && pathname === '/api/v1/chat') {
      const services = getActiveServices();
      if (services.length === 0) return new Response(JSON.stringify({ error: "No AI services available" }), { status: 503, headers: corsHeaders });

      let messages: ChatMessage[];
      let useStream = true;
      try {
        const body = await req.json() as any;
        messages = body.messages;
        if (body.stream === false || body.stream === 'false') useStream = false;
      } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders }); }

      const service = getNextService();
      if (!service) return new Response(JSON.stringify({ error: "Service selection failed" }), { status: 500, headers: corsHeaders });

      if (useStream) {
        const sseStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of await service.chat(messages)) {
                controller.enqueue(`data: ${JSON.stringify({ content: chunk })}\n\n`);
              }
              controller.close();
            } catch (error: any) {
              controller.enqueue(`data: ${JSON.stringify({ error: error.message })}\n\n`);
              controller.close();
            }
          }
        });
        return new Response(sseStream as any, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
      } else {
        try {
          const response = await service.chat(messages);
          return new Response(JSON.stringify({ content: response }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }
      }
    }

    // Projects
    if (req.method === 'GET' && pathname === '/api/v1/projects') {
      return new Response(JSON.stringify(dbService.getProjects()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/')) {
      const parts = pathname.split('/');
      const projectId = parts[4];
      if (parts.length === 5 && projectId) {
        const project = dbService.getProjectById(projectId);
        if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify(project), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname === '/api/v1/system/config') {
      return new Response(JSON.stringify({ workspaceRoot: getWorkspaceRoot() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET' && pathname === '/api/v1/system/readiness') {
      try {
        return new Response(JSON.stringify(await getSystemReadiness()), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname === '/api/v1/system/activation/validate') {
      try {
        const body = await req.json().catch(() => ({} as any)) as any;
        const result = await validateActivationKey(body.activationKey || "");
        if (result.valid) {
          const now = new Date().toISOString();
          const normalized = dbService.upsertActivationState({
            license_id: result.licenseId || "local-license",
            customer_name: result.customerName || "Operator",
            activation_key_hash: hashActivationKey(body.activationKey || ""),
            activation_status: "validated",
            activation_mode: "webhook",
            activated_at: now,
            last_validated_at: now
          });
          persistActivationKey(body.activationKey || "");
          const payload = buildActivationSessionPayload();
          return new Response(JSON.stringify({
            valid: true,
            customerName: normalized?.customer_name || "Operator",
            message: result.message || "Activation approved."
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Set-Cookie': payload ? createSessionCookie(payload) : clearSessionCookie()
            }
          });
        }

        const status = result.valid ? 200 : 401;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ valid: false, message: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'POST' && pathname === '/api/v1/system/activation/revalidate') {
      try {
        const persistedKey = readPersistedActivationKey();
        const activation = dbService.getActivationState();

        if (!persistedKey || !activation || activation.activation_status !== "validated") {
          return new Response(JSON.stringify(getActivationClientState(req)), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() }
          });
        }

        const result = await validateActivationKey(persistedKey);
        if (!result.valid) {
          clearPersistedActivationKey();
          dbService.upsertActivationState({
            license_id: null,
            customer_name: null,
            activation_key_hash: null,
            activation_status: "locked",
            activation_mode: null,
            activated_at: null,
            last_validated_at: null,
            onboarding_completed: false,
            survey_json: null
          });
          return new Response(JSON.stringify({
            status: "locked",
            maskedKey: null,
            customerName: null,
            validatedAt: null,
            survey: null,
            completedAt: null,
            message: result.message || "Activation key is no longer valid."
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() }
          });
        }

        const normalized = dbService.upsertActivationState({
          license_id: result.licenseId || activation.license_id || "local-license",
          customer_name: result.customerName || activation.customer_name || "Operator",
          activation_status: "validated",
          activation_mode: "webhook",
          last_validated_at: new Date().toISOString(),
          onboarding_completed: activation.onboarding_completed,
          survey_json: activation.survey || null
        });
        const payload = buildActivationSessionPayload();
        return new Response(JSON.stringify({
          status: "validated",
          maskedKey: normalized?.activation_key_hash ? `${normalized.activation_key_hash.slice(0, 4)}****` : "valid",
          customerName: normalized?.customer_name || "Operator",
          validatedAt: normalized?.activated_at || null,
          survey: normalized?.survey || null,
          completedAt: normalized?.onboarding_completed ? normalized?.last_validated_at || normalized?.activated_at || null : null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': payload ? createSessionCookie(payload) : clearSessionCookie() }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'GET' && pathname === '/api/v1/system/activation/session') {
      const clientState = getActivationClientState(req);
      const payload = buildActivationSessionPayload();
      return new Response(JSON.stringify(clientState), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Set-Cookie': clientState.status === "validated" && payload ? createSessionCookie(payload) : clearSessionCookie()
        }
      });
    }

    if (req.method === 'POST' && pathname === '/api/v1/system/activation/onboarding') {
      const session = readActivationSession(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Activation required" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() }
        });
      }

      try {
        const body = await req.json().catch(() => ({} as any)) as any;
        const normalized = dbService.saveOnboardingSurvey(body.survey || {});
        const payload = buildActivationSessionPayload();
        return new Response(JSON.stringify({
          status: "validated",
          customerName: normalized?.customer_name || session.customerName || "Operator",
          validatedAt: normalized?.activated_at || null,
          survey: normalized?.survey || {},
          completedAt: normalized?.last_validated_at || normalized?.activated_at || null
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Set-Cookie': payload ? createSessionCookie(payload) : clearSessionCookie()
          }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // API v1 Project Files List
    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/files')) {
      const projectId = pathname.split('/')[4];
      const project = dbService.getProjects().find(p => p.id === projectId);
      if (!project) return new Response("Project not found", { status: 404, headers: corsHeaders });
      const files = await projectManager.listProjectFiles(project.path);
      return new Response(JSON.stringify(files), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // API v1 Read Project File
    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.includes('/read/')) {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const filePath = decodeURIComponent(parts.slice(parts.indexOf('read') + 1).join('/'));
      const project = dbService.getProjects().find(p => p.id === projectId);
      if (!project) return new Response("Project not found", { status: 404, headers: corsHeaders });
      try {
        const content = await projectManager.readFile(project.path, filePath);
        return new Response(content, { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
      } catch (e: any) { return new Response(e.message, { status: 500, headers: corsHeaders }); }
    }

    // API v1 Project System Events (JSON Polling)
    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/events')) {
      const projectId = pathname.split('/')[4];
      const events = dbService.getSystemEvents(projectId as string);
      return new Response(JSON.stringify(events), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST' && pathname === '/api/v1/projects') {
      try {
        const body = await req.json() as any;
        const parsedConfig = typeof body.config === 'string' ? JSON.parse(body.config || '{}') : (body.config || {});
        const projectPath = resolveProjectPath(body.name, parsedConfig.folder);

        if (!existsSync(projectPath)) {
          mkdirSync(projectPath, { recursive: true });
        }

        const id = dbService.addProject(body.name, projectPath, undefined, parsedConfig);
        return new Response(JSON.stringify({ id, path: projectPath }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/prepare')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        orchestratorService.prepareEnvironment(projectId).catch((error) => {
          console.error(`[Prepare ${projectId}]`, error);
        });
        return new Response(JSON.stringify({ success: true, accepted: true, projectId }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/launch-app')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Project not found");

        const launchResult = await dockerService.launchApp(projectId, project.path, project.config);
        const previewStatus = await getProjectPreviewStatus(projectId);
        const currentDetails = project.environment_details || {};
        dbService.updateProject(projectId, {
          environment_details: {
            ...currentDetails,
            launchCommand: launchResult.command,
            launchReady: launchResult.started,
            launchReason: launchResult.reason || null,
            previewReady: previewStatus.reachable
          }
        });

        return new Response(JSON.stringify({
          success: launchResult.started,
          launchCommand: launchResult.command,
          reason: launchResult.reason || null,
          previewStatus
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/generate-tasks')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const body = await req.json().catch(() => ({} as any)) as any;
        orchestratorService.analyzeSpecialists(projectId, body.goal).catch((error) => {
          console.error(`[AnalyzeSpecialists ${projectId}]`, error);
        });
        return new Response(JSON.stringify({ success: true, accepted: true, projectId }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/specialist-reviews')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(dbService.getSpecialistReviewsByProject(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/decision-requests')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(dbService.getDecisionRequestsByProject(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/thread-messages')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(dbService.getProjectThreadMessages(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/preview-status')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const status = await getProjectPreviewStatus(projectId);
        return new Response(JSON.stringify(status), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/agent-interactions')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(dbService.getAgentInteractionsByProject(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/execution-audit')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(dbService.getTaskCheckpointAuditByProject(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/interaction-budgets')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(dbService.getInteractionBudgetsByProject(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/routemap')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        return new Response(JSON.stringify(orchestratorService.getRouteMap(projectId)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/materialize-tasks')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const taskIds = await orchestratorService.materializeTasksFromReviews(projectId);
        return new Response(JSON.stringify({ success: true, taskIds }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/user-prompt')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const body = await req.json().catch(() => ({} as any)) as any;
        const result = await orchestratorService.createTaskFromUserPrompt(projectId, body.message || '');
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/tasks/') && pathname.endsWith('/decision-request')) {
      try {
        const taskId = pathname.split('/')[4];
        if (!taskId) throw new Error("Task id is required");
        const body = await req.json() as any;
        const requestId = await orchestratorService.createDecisionRequest({
          projectId: body.projectId,
          taskId,
          agentId: body.agentId,
          question: body.question,
          context: body.context,
          options: body.options,
          recommendedOption: body.recommendedOption,
          impactIfDelayed: body.impactIfDelayed
        });
        return new Response(JSON.stringify({ success: true, requestId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/tasks/') && pathname.endsWith('/retry')) {
      try {
        const taskId = pathname.split('/')[4];
        if (!taskId) throw new Error("Task id is required");
        const result = await orchestratorService.retryFailedTask(taskId);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/tasks/') && pathname.endsWith('/resume')) {
      try {
        const taskId = pathname.split('/')[4];
        if (!taskId) throw new Error("Task id is required");
        const result = await orchestratorService.resumePausedTask(taskId);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/decision-requests/') && pathname.endsWith('/answer')) {
      try {
        const requestId = pathname.split('/')[4];
        if (!requestId) throw new Error("Decision request id is required");
        const body = await req.json() as any;
        const result = await orchestratorService.answerDecisionRequest(requestId, body.userResponse);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/tasks/') && pathname.endsWith('/agent-interaction')) {
      try {
        const taskId = pathname.split('/')[4];
        if (!taskId) throw new Error("Task id is required");
        const body = await req.json() as any;
        const interactionId = await orchestratorService.createAgentInteraction({
          projectId: body.projectId,
          taskId,
          fromAgentId: body.fromAgentId,
          toAgentId: body.toAgentId,
          type: body.type,
          message: body.message
        });
        return new Response(JSON.stringify({ success: true, interactionId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/agent-interactions/') && pathname.endsWith('/resolve')) {
      try {
        const interactionId = pathname.split('/')[4];
        if (!interactionId) throw new Error("Interaction id is required");
        const body = await req.json() as any;
        const result = await orchestratorService.resolveAgentInteraction(interactionId, {
          response: body.response,
          approved: !!body.approved
        });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.includes('/interaction-budgets/') && pathname.endsWith('/reset')) {
      try {
        const parts = pathname.split('/');
        const projectId = parts[4];
        const agentId = parts[6];
        if (!projectId || !agentId) throw new Error("Project id and agent id are required");
        const result = await orchestratorService.resetAgentInteractionBudget(projectId, agentId);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/cleanup')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const result = await orchestratorService.cleanupProjectArtifacts(projectId);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'GET' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/runtime')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const result = await orchestratorService.getProjectRuntime(projectId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/start')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        orchestratorService.startProjectRuntime(projectId).catch((error) => {
          console.error(`[StartRuntime ${projectId}]`, error);
        });
        return new Response(JSON.stringify({ success: true, accepted: true, projectId }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/v1/projects/') && pathname.endsWith('/stop')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        const result = await orchestratorService.stopProjectRuntime(projectId);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/v1/projects/')) {
      try {
        const projectId = pathname.split('/')[4];
        if (!projectId) throw new Error("Project id is required");
        await orchestratorService.cleanupProjectArtifacts(projectId);
        const deleted = dbService.deleteProjectById(projectId);
        return new Response(JSON.stringify({ success: deleted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Agents
    if (req.method === 'GET' && pathname === '/api/v1/agents') {
      return new Response(JSON.stringify(dbService.getAgents()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Tasks
    if (req.method === 'GET' && pathname.startsWith('/api/v1/tasks/')) {
      const projectId = pathname.split('/').pop() || "";
      return new Response(JSON.stringify(dbService.getTasksByProject(projectId)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Orchestrate
    if (req.method === 'POST' && pathname === '/api/v1/orchestrate') {
      try {
        const body = await req.json() as any;
        orchestratorService.orchestrate(body.projectId, body.goal).catch(console.error);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
});

console.log(`Backend server is running on ${server.url}`);
