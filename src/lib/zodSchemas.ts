/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * kinesis-ast-test-repo: Zod Runtime Validation Schemas
 * Reference target schemas for Directive 1: "+ Add Zod Guard"
 */

import { z } from 'zod';

export const MetricCategorySchema = z.enum([
  'throughput',
  'latency',
  'error_rate',
  'cpu_saturation',
  'memory_usage',
]);

export const MetricItemSchema = z.object({
  id: z.string().min(1, 'Metric ID cannot be empty'),
  timestamp: z.number().int().positive(),
  category: MetricCategorySchema,
  value: z.number(),
  unit: z.string(),
  service: z.string(),
  tags: z.record(z.union([z.string(), z.number()])),
  anomalyScore: z.number().min(0).max(1).optional(),
  metadata: z
    .object({
      region: z.string(),
      clusterId: z.string(),
      environment: z.enum(['production', 'staging', 'canary']),
    })
    .optional(),
});

export const MetricsPipelineResponseSchema = z.object({
  status: z.enum(['success', 'partial', 'error']),
  data: z.array(MetricItemSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  serverTimestamp: z.number().int().positive(),
  telemetryEcho: z
    .object({
      clientIp: z.string().optional(),
      userEmail: z.string().optional(),
      tokenFingerprint: z.string().optional(),
    })
    .optional(),
});

export type ValidatedMetricItem = z.infer<typeof MetricItemSchema>;
export type ValidatedMetricsPipelineResponse = z.infer<typeof MetricsPipelineResponseSchema>;
