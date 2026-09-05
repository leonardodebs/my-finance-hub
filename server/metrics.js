// Instrumentação Prometheus da API.
//
// As métricas são raspadas pelo Prometheus que roda no host (fora do cluster),
// via http://<host>/api/metrics através do Ingress.

import promClient from 'prom-client';

export const registry = new promClient.Registry();

registry.setDefaultLabels({ app: 'finance-api' });

// CPU, memória, lag do event loop, garbage collection e handles abertos.
promClient.collectDefaultMetrics({ register: registry });

// Buckets ajustados para uma API que responde em dezenas de milissegundos.
// O default do prom-client vai até 10s, o que desperdiça resolução onde
// as requisições realmente vivem.
export const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const importedTransactions = new promClient.Counter({
  name: 'finance_imported_transactions_total',
  help: 'Transações gravadas por importação de extrato',
  labelNames: ['result'], // inserted | skipped
  registers: [registry],
});

export const importPreviews = new promClient.Counter({
  name: 'finance_import_previews_total',
  help: 'Arquivos de extrato processados no preview',
  labelNames: ['format', 'result'], // OFX|CSV|unknown / ok|error
  registers: [registry],
});

export const dbUp = new promClient.Gauge({
  name: 'finance_database_up',
  help: '1 se a última verificação do banco respondeu, 0 caso contrário',
  registers: [registry],
});

/**
 * Middleware que cronometra as requisições.
 *
 * Usa o PADRÃO da rota (/api/transactions/:id) e não o caminho concreto
 * (/api/transactions/4821). Rotular pelo caminho cru criaria uma série
 * temporal nova por id — o erro clássico de cardinalidade que derruba
 * um Prometheus com o tempo.
 */
export const metricsMiddleware = (req, res, next) => {
  // O /metrics não se cronometra, senão vira ruído sobre si mesmo.
  if (req.path === '/api/metrics') return next();

  const end = httpDuration.startTimer();

  res.on('finish', () => {
    // req.route só existe depois do roteamento; requisições que não casaram
    // com nenhuma rota são agrupadas para não vazar caminhos arbitrários.
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : 'unmatched';

    end({ method: req.method, route, status: res.statusCode });
  });

  next();
};
