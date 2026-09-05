const GHL_BASE_URL = "https://services.leadconnectorhq.com";

const FIELD_IDS = {
  tier: "vVg5PWxBAY0XfJvkiaBI",
  status: "xLfkNSdxPHYaWrJb5Uqh",
  signupDate: "JIzGzf38JmwsPpufQUZr",
  lastLogin: "93LJzUTjnIRq6iRzf2Cn",
  totalSessions: "FIhlbOWCS1UFCn59wA3Z",
  lastSessionDate: "qRio9dNdsnly68yOkg7y",
  appUserId: "jsBO3yN7GI9RFwGk3ZCe",
} as const;

type SubscriptionState = "none" | "active" | "trialing" | "canceled" | "past_due";
type Tier = "free" | "pro" | "premium";

type ContactBase = {
  email?: string | null;
  name?: string | null;
  userId: string;
  tier?: Tier;
  status?: SubscriptionState;
  signupDate?: string | null;
  lastLogin?: string | null;
};

export type GHLContactInput = ContactBase & {
  tags?: string[];
  customFields?: Array<{ id: string; value: string | number }>;
};

export type GHLSubscriptionInput = ContactBase & {
  tier: Tier;
  status: SubscriptionState;
};

export type GHLSessionInput = ContactBase & {
  totalSessions: number;
  lastSessionDate: string;
};

export function ghlConfigured(): boolean {
  return Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
}

function dateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function statusTag(status: SubscriptionState | undefined): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past-due";
  return "canceled";
}

function buildTags(tier: Tier = "free", status: SubscriptionState = "none", extra: string[] = []): string[] {
  return [...new Set(["quantum-therapy-user", `qt-tier-${tier}`, `qt-subscription-${statusTag(status)}`, ...extra])];
}

function subscriptionFields(input: ContactBase): Array<{ id: string; value: string | number }> {
  const fields: Array<{ id: string; value: string | number }> = [{ id: FIELD_IDS.appUserId, value: input.userId }];
  if (input.tier) fields.push({ id: FIELD_IDS.tier, value: input.tier });
  if (input.status) fields.push({ id: FIELD_IDS.status, value: input.status });
  const signupDate = dateOnly(input.signupDate);
  const lastLogin = dateOnly(input.lastLogin);
  if (signupDate) fields.push({ id: FIELD_IDS.signupDate, value: signupDate });
  if (lastLogin) fields.push({ id: FIELD_IDS.lastLogin, value: lastLogin });
  return fields;
}

async function upsert(input: GHLContactInput): Promise<string | null> {
  if (!ghlConfigured()) return null;
  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        email: input.email ?? undefined,
        name: input.name ?? undefined,
        tags: buildTags(input.tier, input.status, input.tags),
        customFields: [...subscriptionFields(input), ...(input.customFields ?? [])],
      }),
    });
    if (!response.ok) {
      console.warn("GHL contact sync failed", response.status, await response.text());
      return null;
    }
    const body = (await response.json()) as { contact?: { id?: string }; id?: string };
    return body.contact?.id ?? body.id ?? null;
  } catch (error) {
    console.warn("GHL contact sync failed", error);
    return null;
  }
}

/** Creates or updates the app contact. This function never throws. */
export async function upsertGHLContact(input: GHLContactInput): Promise<string | null> {
  return upsert(input);
}

/** Writes the current plan and subscription state to the contact. This function never throws. */
export async function syncSubscriptionToGHL(input: GHLSubscriptionInput): Promise<string | null> {
  return upsert(input);
}

/** Writes aggregate usage information to the contact. This function never throws. */
export async function syncSessionToGHL(input: GHLSessionInput): Promise<string | null> {
  return upsert({
    ...input,
    customFields: [
      { id: FIELD_IDS.totalSessions, value: input.totalSessions },
      { id: FIELD_IDS.lastSessionDate, value: dateOnly(input.lastSessionDate) ?? input.lastSessionDate },
    ],
  });
}
