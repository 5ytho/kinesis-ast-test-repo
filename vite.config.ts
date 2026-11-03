import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const apiMockPlugin = () => ({
  name: 'api-mock-metrics',
  configureServer(server: any) {
    server.middlewares.use('/api/v1/telemetry/metrics', (req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json');
      const count = 75;
      const categories = ['throughput', 'latency', 'error_rate', 'cpu_saturation', 'memory_usage'];
      const services = ['auth-service', 'payment-gateway', 'inventory-api', 'kinesis-stream-processor', 'edge-proxy'];
      const now = Date.now();
      const items = Array.from({ length: count }, (_, i) => ({
        id: `metric-node-${i + 1000}`,
        timestamp: now - (count - i) * 15000,
        category: categories[i % categories.length],
        value: Math.round(((i % 5 === 0 ? 2500 : 42) + (i % 7) * 22) * 100) / 100,
        unit: i % 5 === 0 ? 'req/sec' : 'ms',
        service: services[i % services.length],
        tags: { nodeIndex: i, rack: `rack-${i % 4}`, priority: i % 2 === 0 ? 'high' : 'normal' },
        anomalyScore: i % 11 === 0 ? 0.94 : 0.15,
        metadata: { region: 'us-east-1', clusterId: `c-${(i % 3) + 1}`, environment: 'production' },
      }));
      res.end(JSON.stringify({
        status: 'success',
        data: items,
        totalCount: items.length,
        page: 1,
        pageSize: items.length,
        serverTimestamp: now,
        telemetryEcho: {
          clientIp: req.headers['x-forwarded-client-ip'],
          userEmail: req.headers['x-user-email'],
          tokenReceived: Boolean(req.headers['x-account-token']),
        },
      }));
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiMockPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
