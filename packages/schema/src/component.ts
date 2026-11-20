import { z } from "zod";

export const Component = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  icon: z.string().min(1),
  category: z.enum(["traffic", "storage", "messaging", "compute", "reliability", "security"]),
  oneLine: z.string().min(1),
  useWhen: z.array(z.string()),
  watchOut: z.array(z.string()),
  numbers: z.array(z.object({ label: z.string(), value: z.string() })),
  tools: z.array(z.string()),
});
export type Component = z.infer<typeof Component>;
