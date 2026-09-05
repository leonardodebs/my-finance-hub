// Sugestão de categoria a partir da descrição do lançamento.
//
// É só um palpite: a tela de conferência sempre deixa a pessoa corrigir antes
// de gravar. O objetivo é reduzir cliques, não acertar 100%.
//
// O vocabulário foi calibrado com extratos reais. Duas lições que valem para
// qualquer regra nova aqui:
//
//   1. Maquininha TRUNCA. "AMERICA PARK ESTACIONA" nunca vira "estacionamento",
//      então as chaves precisam ser o radical curto, não a palavra completa.
//   2. Adquirente PREFIXA. O iFood aparece como "IFD*", a Shopee como "SHPP".
//      O nome comercial sozinho não basta.
//
// `keywords` casa por substring. `patterns` existe para quando a chave é curta
// demais e precisa de fronteira de palavra (ex.: "SUP" não pode casar "SUPORTE").

const RULES = [
  {
    category: 'Supermercado',
    keywords: [
      'supermerc', 'atacad', 'assai', 'carrefour', 'pao de acucar', 'extra ',
      'big box', 'hortifruti', 'mercadinho', 'bretas', 'quitanda',
    ],
    // "SUP BARRETO" — abreviação de supermercado no descritor do cartão
    patterns: [/\bsup\b/],
  },
  {
    category: 'Alimentação',
    keywords: [
      // Agregadores e seus prefixos de adquirente
      'ifood', 'ifd*', 'rappi', 'jim.com', 'uber eats',
      // Tipos de estabelecimento
      'restaurant', 'lanchonete', 'sanduich', 'sanduch', 'padaria',
      'pizzar', 'hamburgueria', 'burger', 'burguer', 'churrascaria',
      'sorveteria', 'doceria', 'confeitaria', 'espetinho', 'temaki', 'sushi',
      'acai', 'bistro', 'poke', 'esfiha', 'cafeteria', 'pastelaria',
      'mc donalds', 'mcdonalds', 'subway', 'burger king', 'habibs',
    ],
  },
  {
    category: 'Combustível',
    keywords: ['posto', 'ipiranga', 'shell', 'petrobras', 'br distrib', 'ale combust', 'gasolina', 'etanol'],
  },
  {
    category: 'Farmácia',
    keywords: ['farmacia', 'drogaria', 'droga raia', 'drogasil', 'pacheco', 'panvel', 'ultrafarma'],
  },
  {
    category: 'Estacionamento',
    // "estaciona" e não "estacionamento": o descritor corta a palavra
    keywords: ['estaciona', 'parking', 'zona azul', 'estapar', 'multipark'],
  },
  {
    category: 'Corte cabelo',
    keywords: ['barbearia', 'barber', 'cabeleire', 'salao de beleza'],
  },
  {
    category: 'Cartão crédito',
    keywords: ['fatura'],
  },
  {
    category: 'Vivo celulares',
    keywords: ['vivo ', 'claro ', 'tim ', 'oi movel', 'telefonica'],
  },
  {
    category: 'Internet casa',
    keywords: ['net serv', 'internet', 'banda larga', 'fibra'],
  },
  {
    category: 'Compras online',
    keywords: [
      'mercado livre', 'mercadolivre', 'mercadopago', 'mercado pago',
      'amazon', 'shopee', 'shpp', 'aliexpress', 'magazine luiza', 'magalu',
      'americanas', 'shein',
    ],
  },
  {
    category: 'Lazer',
    keywords: [
      'netflix', 'spotify', 'disney', 'hbo', 'prime video', 'cinema',
      'youtube premium', 'steam', 'playstation', 'xbox', 'crunchyroll',
    ],
  },
  {
    category: 'Transporte',
    keywords: ['uber', '99app', '99 tecnologia', 'cabify', 'metro', 'pedagio', 'sem parar', 'conectcar'],
  },
  {
    category: 'Saúde',
    keywords: ['hospital', 'clinica', 'laborator', 'unimed', 'amil', 'bradesco saude', 'dentista', 'psicolog'],
  },
  {
    category: 'Educação',
    keywords: ['faculdade', 'universidade', 'curso', 'udemy', 'alura', 'escola', 'colegio'],
  },
  {
    category: 'Vestuário',
    keywords: ['renner', 'riachuelo', 'c&a', 'zara', 'nike', 'adidas', 'centauro'],
  },
  {
    category: 'Casa',
    keywords: [
      'leroy', 'telhanorte', 'condominio', 'aluguel', 'energia', 'enel',
      'cemig', 'copel', 'sabesp', 'agua', 'luz ', 'gas ', 'utilidade',
    ],
  },
  {
    category: 'Carro',
    keywords: ['oficina', 'mecanic', 'autopec', 'ipva', 'licenciament', 'seguro auto', 'detran'],
  },
  {
    category: 'Viagens',
    keywords: ['hotel', 'airbnb', 'latam', 'gol ', 'azul linhas', 'decolar', 'booking'],
  },
];

const REVENUE_RULES = [
  {
    category: 'Salário',
    keywords: ['salario', 'remunera', 'folha pgto', 'proventos', 'adiantamento'],
  },
  {
    category: 'Freelance',
    keywords: ['freela', 'servico prestad', 'nota fiscal'],
  },
  {
    category: 'Empréstimos',
    // Vem ANTES de Investimentos: "credito pessoal" e "antecipacao" são
    // entrada de dinheiro emprestado, não rendimento.
    keywords: [
      'emprestimo', 'credito pessoal', 'consignado', 'financiamento',
      'antecipacao fgts', 'antecipacao saque', 'cred pessoal',
    ],
  },
  {
    category: 'Investimentos',
    keywords: ['rendiment', 'dividend', 'juros', 'resgate', 'cdb', 'rdb', 'tesouro', 'aplicacao', 'cashback'],
  },
];

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Sugere uma categoria para um lançamento.
 * @param {string} description descrição vinda do extrato
 * @param {'expense'|'revenue'} type natureza do lançamento
 * @param {string[]} availableCategories categorias que a pessoa já tem cadastradas
 * @returns {string}
 */
export const suggestCategory = (description, type, availableCategories = []) => {
  const text = normalize(description || '');
  const rules = type === 'revenue' ? REVENUE_RULES : RULES;

  for (const rule of rules) {
    const hit =
      (rule.keywords || []).some((k) => text.includes(k)) ||
      (rule.patterns || []).some((p) => p.test(text));

    if (hit) {
      // Só sugere o que a pessoa realmente pode selecionar. Se ela apagou
      // a categoria, cair em "Outros" é melhor que criar uma órfã.
      if (availableCategories.length === 0 || availableCategories.includes(rule.category)) {
        return rule.category;
      }
    }
  }

  // Pix entre pessoas físicas não tem como ser classificado automaticamente:
  // "Transferência enviada pelo Pix - Fulano de Tal" pode ser qualquer coisa.
  // Deixar em "Outros" é mais honesto que chutar.
  return 'Outros';
};
