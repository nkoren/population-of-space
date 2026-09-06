/**
 * Zod schemas for the YAML source data in data/.
 * These are the single definition of what a valid record looks like;
 * docs/DATA.md is the human-readable version of the same thing.
 */
import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase-hyphen slug');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'must be YYYY-MM-DDTHH:MM:SSZ (UTC)');
const nationCode = z.string().regex(/^[A-Z]{2}$/, 'must be an ISO 3166-1 alpha-2 code');

export const NationSchema = z.object({
  code: nationCode,
  name: z.string().min(1),
  note: z.string().optional(),
});

export const DestinationSchema = z.object({
  id: slug,
  name: z.string().min(1),
  description: z.string().optional(),
});

export const PersonSchema = z.object({
  id: slug,
  name: z.string().min(1),
  born: isoDate.nullable(),
  sex: z.enum(['M', 'F']),
  nationality: z.array(nationCode).min(1),
  wiki: z.string().url().optional(),
  note: z.string().optional(),
});

export const FlightSchema = z.object({
  id: slug,
  name: z.string().min(1),
  launch: isoDateTime,
  /** null = still in space as of the data build. */
  landing: isoDateTime.nullable(),
  launch_nation: nationCode,
  destination: slug,
  sector: z.enum(['government', 'commercial']),
  crew_up: z.array(slug),
  crew_down: z.array(slug),
  wiki: z.string().url().optional(),
  note: z.string().optional(),
});

export type Nation = z.infer<typeof NationSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Flight = z.infer<typeof FlightSchema>;
