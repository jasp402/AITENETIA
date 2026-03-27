import { db, markChange } from "./shared";

type ActivationUpdates = {
  license_id?: string | null;
  customer_name?: string | null;
  activation_key_hash?: string | null;
  activation_status?: string;
  activation_mode?: string | null;
  activated_at?: string | null;
  last_validated_at?: string | null;
  onboarding_completed?: boolean;
  survey_json?: any;
};

const normalizeActivation = (row: any) => {
  if (!row) return null;

  let survey = null;
  if (typeof row.survey_json === "string" && row.survey_json) {
    try {
      survey = JSON.parse(row.survey_json);
    } catch {
      survey = null;
    }
  } else if (row.survey_json && typeof row.survey_json === "object") {
    survey = row.survey_json;
  }

  return {
    id: row.id,
    license_id: row.license_id || null,
    customer_name: row.customer_name || null,
    activation_key_hash: row.activation_key_hash || null,
    activation_status: row.activation_status || "locked",
    activation_mode: row.activation_mode || null,
    activated_at: row.activated_at || null,
    last_validated_at: row.last_validated_at || null,
    onboarding_completed: row.onboarding_completed === 1,
    survey
  };
};

export const activationDb = {
  getActivationState: () => {
    const row = db.query("SELECT * FROM activation_state WHERE id = 'default'").get() as any;
    return normalizeActivation(row);
  },

  upsertActivationState: (updates: ActivationUpdates) => {
    const existing = activationDb.getActivationState();
    const next = {
      id: "default",
      license_id: updates.license_id ?? existing?.license_id ?? null,
      customer_name: updates.customer_name ?? existing?.customer_name ?? null,
      activation_key_hash: updates.activation_key_hash ?? existing?.activation_key_hash ?? null,
      activation_status: updates.activation_status ?? existing?.activation_status ?? "locked",
      activation_mode: updates.activation_mode ?? existing?.activation_mode ?? null,
      activated_at: updates.activated_at ?? existing?.activated_at ?? null,
      last_validated_at: updates.last_validated_at ?? existing?.last_validated_at ?? null,
      onboarding_completed: updates.onboarding_completed ?? existing?.onboarding_completed ?? false,
      survey_json: updates.survey_json ?? existing?.survey ?? null
    };

    db.query(`
      INSERT OR REPLACE INTO activation_state (
        id, license_id, customer_name, activation_key_hash, activation_status, activation_mode,
        activated_at, last_validated_at, onboarding_completed, survey_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      next.id,
      next.license_id,
      next.customer_name,
      next.activation_key_hash,
      next.activation_status,
      next.activation_mode,
      next.activated_at,
      next.last_validated_at,
      next.onboarding_completed ? 1 : 0,
      next.survey_json == null ? null : JSON.stringify(next.survey_json)
    );

    markChange();
    return activationDb.getActivationState();
  },

  saveOnboardingSurvey: (survey: any) => {
    const now = new Date().toISOString();
    return activationDb.upsertActivationState({
      survey_json: survey,
      onboarding_completed: true,
      last_validated_at: now
    });
  },

  getSecuritySetting: (key: string) => {
    const row = db.query("SELECT value FROM app_security WHERE key = ?").get(key) as { value: string } | null;
    return row?.value || null;
  },

  setSecuritySetting: (key: string, value: string) => {
    db.query("INSERT OR REPLACE INTO app_security (key, value, updated_at) VALUES (?, ?, ?)").run(key, value, new Date().toISOString());
    markChange();
    return value;
  }
};
