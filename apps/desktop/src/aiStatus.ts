import type { AiProviderDescription } from "@continuum/core/browser";

export type AiProviderHealth = {
  checkedAt: string;
  providerId: string;
  ready: boolean;
  strictMode: boolean;
};

export function formatAiStatus(provider?: AiProviderDescription, health?: AiProviderHealth) {
  if (!provider) return "AI unknown";
  if (health?.strictMode && health.ready) return "Strict AI ready";
  if (health?.strictMode && !health.ready) return "Strict AI blocked";
  return provider.configured ? provider.label : "Configure AI";
}

export function formatAiSettingsSummary(provider?: AiProviderDescription, health?: AiProviderHealth) {
  if (!provider) return "AI provider status is unavailable.";
  const mode = health?.strictMode ? "Strict AI mode" : "Fallback mode";
  const readiness = health?.ready ? "ready" : "not ready";
  const endpoint = provider.endpoint ? ` Endpoint: ${provider.endpoint}.` : "";
  const model = provider.model ? ` Model: ${provider.model}.` : "";
  return `${mode}: ${provider.label} is ${readiness}.${endpoint}${model}`;
}
