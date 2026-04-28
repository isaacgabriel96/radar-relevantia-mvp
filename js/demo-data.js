/**
 * demo-data.js — Dados centralizados para o modo demonstração.
 *
 * MANUTENÇÃO: Ao adicionar uma feature que usa dados do banco,
 * adicione dados de exemplo aqui no objeto DEMO correspondente
 * (DEMO.marca ou DEMO.detentor) com a mesma estrutura que o banco real usará.
 *
 * ATUALIZAR A DEMO: edite apenas este arquivo.
 * A demo herda automaticamente qualquer atualização de UI dos dashboards.
 *
 * Include AFTER core.js:
 *   <script src="js/core.js"></script>
 *   <script src="js/demo-data.js"></script>
 */

window.DEMO = {

  // ══════════════════════════════════════
  //  MARCA (Brand) — Nike Brasil
  // ══════════════════════════════════════
  marca: {
    user: {
      nome: 'Nike Brasil',
      email: 'contato@nikebrasil.com',
      responsavel: 'Carlos Mendes',
      cnpj: '12.345.678/0001-00',
      segmento: 'Esportes',
      telefone: '(11) 3456-7890',
      site: 'https://nike.com.br',
      descricao: 'Marca líder mundial em artigos esportivos, moda atlética e inovação em performance. Presente em mais de 190 países, conectando atletas e amantes do esporte.',
      cargo: 'Diretor de Marketing',
      // Campos para populateConfigFields
      empresa: 'Nike Brasil',
      website: 'https://nike.com.br'
    },
    // Propostas no formato de rowToNegociacaoMarca (campo `marca` = nome do detentor)
    propostas: [
      {
        id: 'p1', _supaId: 'p1',
        opp_id: 101, opp: 'Rock in Rio — Cota Premium',
        categoria: 'Evento',
        marca: 'Rock in Rio Entretenimento',
        cota: 'Patrocinador Premium', assunto: 'Proposta de patrocínio premium',
        valor: 'R$ 180.000', enviadaEm: '10/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: 'Aguardando assinatura do contrato',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 180000, propostoPor: 'marca', status: 'aceito' },
        valor_deal: 180000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',   texto: 'Temos grande interesse em sermos patrocinadores premium do Rock in Rio. Gostaríamos de discutir os entregáveis e condições de pagamento.', data: '10/04 · 09:30' },
          { autor: 'detentor', nome: 'Rock in Rio',            texto: 'Ótimo! Sua proposta foi aprovada internamente. O Rock in Rio tem orgulho em ter a Nike como parceira premium. Vamos alinhar os próximos passos.', data: '11/04 · 14:15' },
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',   texto: 'Perfeito! Podemos agendar uma reunião para detalhar as ativações e o cronograma de entregas?', data: '12/04 · 10:00' }
        ],
        contrapartidas: [
          { id: 1, descricao: 'Naming rights do palco principal',       categoria: 'branding', valor: 80000, prazo: '01/09/2026', status: 'aceita',   propostoPor: 'detentor' },
          { id: 2, descricao: 'Área de ativação exclusiva 200m²',        categoria: 'ativacao', valor: 50000, prazo: '01/09/2026', status: 'aceita',   propostoPor: 'detentor' },
          { id: 3, descricao: 'Inserção em 100% das comunicações do evento', categoria: 'midia', valor: 30000, prazo: '15/08/2026', status: 'aceita', propostoPor: 'marca' },
          { id: 4, descricao: 'Estúdio de customização de tênis on-site', categoria: 'ativacao', valor: 20000, prazo: '01/09/2026', status: 'proposta', propostoPor: 'marca' }
        ]
      },
      {
        id: 'p2', _supaId: 'p2',
        opp_id: 102, opp: 'Maratona Internacional SP 2026',
        categoria: 'Evento',
        marca: 'SP Marathon Club',
        cota: 'Patrocinador Oficial do Equipamento', assunto: 'Parceria equipamento oficial',
        valor: 'R$ 50.000', enviadaEm: '08/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 50000, propostoPor: 'detentor', status: 'aceito' },
        valor_deal: 50000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',   texto: 'Somos parceiros históricos de maratonas e queremos fortalecer nossa presença na Maratona de SP.', data: '08/04 · 11:20' },
          { autor: 'detentor', nome: 'SP Marathon Club',       texto: 'Excelente! A Nike é uma parceira ideal para a nossa maratona. Proposta aceita! Enviaremos os detalhes do contrato.', data: '09/04 · 08:50' }
        ],
        contrapartidas: [
          { id: 5, descricao: 'Nike como tênis oficial dos participantes', categoria: 'branding', valor: 25000, prazo: '15/03/2027', status: 'aceita', propostoPor: 'marca' },
          { id: 6, descricao: 'Branding na linha de chegada e largada',   categoria: 'branding', valor: 15000, prazo: '15/03/2027', status: 'aceita', propostoPor: 'detentor' },
          { id: 7, descricao: 'Cobertura digital — 10 posts Stories',     categoria: 'digital',  valor: 10000, prazo: '20/03/2027', status: 'aceita', propostoPor: 'detentor' }
        ]
      },
      {
        id: 'p3', _supaId: 'p3',
        opp_id: 103, opp: 'Ivete Sangalo — Tour Nacional 2026',
        categoria: 'Artista Musical',
        marca: 'Sangalo Produções',
        cota: 'Patrocínio de Tour', assunto: 'Proposta de patrocínio de tour nacional',
        valor: 'R$ 130.000', enviadaEm: '05/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 130000, propostoPor: 'marca', status: 'aceito' },
        valor_deal: 130000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',   texto: 'A Ivete Sangalo tem o perfil perfeito para nossos valores de energia, superação e autenticidade. Gostaríamos de patrocinar o tour completo.', data: '05/04 · 14:00' },
          { autor: 'detentor', nome: 'Sangalo Produções',      texto: 'Que parceria incrível! A Ivete adorou a proposta. Vamos avançar com o contrato.', data: '06/04 · 09:30' }
        ],
        contrapartidas: [
          { id: 8,  descricao: 'Logo Nike em todos os palcos do tour',     categoria: 'branding', valor: 50000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 9,  descricao: 'Ativação Nike Run em 5 cidades do tour',   categoria: 'ativacao', valor: 40000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'marca' },
          { id: 10, descricao: 'Conteúdo co-branded redes sociais (20 posts)', categoria: 'digital', valor: 40000, prazo: '30/11/2026', status: 'aceita', propostoPor: 'detentor' }
        ]
      },
      {
        id: 'p4', _supaId: 'p4',
        opp_id: 104, opp: 'Canal Desimpedidos — YouTube',
        categoria: 'Mídia',
        marca: 'Desimpedidos Media',
        cota: 'Patrocínio de Conteúdo', assunto: 'Patrocínio canal esportivo digital',
        valor: 'R$ 60.000', enviadaEm: '01/04/2026',
        status: 'analise', statusLabel: 'Em análise', statusHint: 'Detentor está avaliando a proposta',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' },
        valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',   texto: 'O Desimpedidos tem um público altamente alinhado ao nosso target de esportes. Propomos um patrocínio de 6 meses de conteúdo exclusivo.', data: '01/04 · 10:15' },
          { autor: 'detentor', nome: 'Desimpedidos Media',     texto: 'Recebemos sua proposta! Estamos avaliando internamente e retornamos em breve com nosso posicionamento.', data: '02/04 · 16:30' }
        ],
        contrapartidas: [
          { id: 11, descricao: 'Menção em 24 vídeos (6 meses)',            categoria: 'midia',    valor: 36000, prazo: '31/10/2026', status: 'proposta', propostoPor: 'detentor' },
          { id: 12, descricao: 'Vídeo exclusivo "Nike x Desimpedidos"',    categoria: 'digital',  valor: 24000, prazo: '31/10/2026', status: 'proposta', propostoPor: 'marca' }
        ]
      },
      {
        id: 'p5', _supaId: 'p5',
        opp_id: 105, opp: 'Rebeca Andrade — Embaixadora de Marca',
        categoria: 'Personalidade',
        marca: 'Rebeca Andrade Assessoria',
        cota: 'Embaixadora Global', assunto: 'Parceria embaixadora olímpica',
        valor: 'R$ 95.000', enviadaEm: '28/03/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: 'Aguardando resposta do detentor',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' },
        valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'Carlos Mendes (Nike)', texto: 'Rebeca Andrade é a maior ginasta do Brasil e uma inspiração global. Gostaríamos de tê-la como nossa embaixadora olímpica para 2026-2028.', data: '28/03 · 09:00' }
        ],
        contrapartidas: []
      },
      {
        id: 'p6', _supaId: 'p6',
        opp_id: 106, opp: 'Fórmula E São Paulo',
        categoria: 'Evento',
        marca: 'Formula E Brasil',
        cota: 'Patrocinador Exclusivo de Categoria',
        assunto: 'Patrocínio Fórmula E SP',
        valor: 'R$ 240.000', enviadaEm: '25/03/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' },
        valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'Carlos Mendes (Nike)', texto: 'A Fórmula E representa inovação e sustentabilidade — valores que compartilhamos. Gostaríamos de discutir uma parceria de categoria.', data: '25/03 · 14:45' }
        ],
        contrapartidas: []
      },
      {
        id: 'p7', _supaId: 'p7',
        opp_id: 107, opp: 'Alok — DJ & Criador de Conteúdo',
        categoria: 'Personalidade',
        marca: 'Alok Produções',
        cota: 'Parceria de Conteúdo Digital', assunto: 'Parceria global digital',
        valor: 'R$ 150.000', enviadaEm: '20/03/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 150000, propostoPor: 'detentor', status: 'aceito' },
        valor_deal: 150000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',  texto: 'Alok tem uma audiência global jovem e engajada. Queremos uma parceria de conteúdo digital para ampliar nossa presença em festivais.', data: '20/03 · 11:00' },
          { autor: 'detentor', nome: 'Alok Produções',        texto: 'Parceria top! Alok já usa Nike nos shows. Vamos formalizar a parceria e criar algo incrível juntos.', data: '21/03 · 15:20' }
        ],
        contrapartidas: [
          { id: 13, descricao: 'Alok veste Nike em todos os shows 2026',   categoria: 'branding', valor: 60000, prazo: '31/12/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 14, descricao: '12 posts co-branded Instagram + TikTok',   categoria: 'digital',  valor: 60000, prazo: '31/12/2026', status: 'aceita', propostoPor: 'marca' },
          { id: 15, descricao: 'Ativação Nike em festival assinado por Alok', categoria: 'ativacao', valor: 30000, prazo: '31/07/2026', status: 'aceita', propostoPor: 'marca' }
        ]
      },
      {
        id: 'p8', _supaId: 'p8',
        opp_id: 108, opp: 'Podcast Flow — Patrocínio Mensal',
        categoria: 'Mídia',
        marca: 'Flow Podcast',
        cota: 'Patrocinador Sênior', assunto: 'Patrocínio podcast esportivo',
        valor: 'R$ 35.000', enviadaEm: '15/03/2026',
        status: 'recusada', statusLabel: 'Recusada', statusHint: 'Cota preenchida por outro patrocinador',
        aceitaNovasPropostas: false,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' },
        valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Carlos Mendes (Nike)',  texto: 'Temos interesse em patrocinar o Flow Sports. Grande audiência e alinhamento com nosso público.', data: '15/03 · 10:30' },
          { autor: 'detentor', nome: 'Flow Podcast',          texto: 'Agradecemos muito o interesse da Nike! Infelizmente esta cota já foi preenchida. Aguardem novas oportunidades no segundo semestre.', data: '16/03 · 09:00' }
        ],
        contrapartidas: []
      }
    ],
    kpis: {
      oportunidades_ativas: 20,
      propostas_enviadas: 8,
      deals_fechados: 4,
      investimento_total: 510000
    }
  },

  // ══════════════════════════════════════
  //  DETENTOR (Rights Holder) — Instituto Esportivo SP
  // ══════════════════════════════════════
  detentor: {
    user: {
      nome: 'Isaac Gabriel',
      email: 'isaac@institutoesportivo.com.br',
      telefone: '(11) 98765-4321',
      cargo: 'Diretor Executivo'
    },
    empresa: {
      nome: 'Instituto Esportivo SP',
      cnpj: '12.345.678/0001-90',
      segmento: 'Esporte',
      telefone: '(11) 99999-0000',
      endereco: 'Av. Paulista, 1000 — São Paulo, SP',
      site: 'https://institutoesportivo.com.br',
      descricao: 'Instituto dedicado à promoção do esporte, cultura e entretenimento. Organizador de eventos de grande porte no Brasil há mais de 15 anos.',
      empresa_domain: 'institutoesportivo.com.br'
    },
    // Oportunidades publicadas pelo detentor (8 no total: 5 publicadas, 2 rascunho, 1 encerrada)
    oportunidades: [
      {
        id: 101, slug: 'rock-in-rio-cota-premium', perfilSlug: 'instituto-esportivo',
        titulo: 'Rock in Rio — Cota Premium',
        categoria: 'Evento',
        descricao: 'Seja o patrocinador premium do maior festival de música do mundo. Presença de marca em todos os palcos, comunicações e ativações.',
        cidade: 'Rio de Janeiro, RJ', localizacao: 'Rio de Janeiro, RJ',
        data: 'Set 2026', status: 'publicada', interesses: 12,
        criadaEm: '01 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#f093fb,#f5576c)',
        imagem_capa: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['festival', 'música', 'premium']
      },
      {
        id: 102, slug: 'maratona-internacional-sp-2026', perfilSlug: 'instituto-esportivo',
        titulo: 'Maratona Internacional SP 2026',
        categoria: 'Evento',
        descricao: '35 mil atletas, cobertura nacional e internacional. A maior maratona da América Latina.',
        cidade: 'São Paulo, SP', localizacao: 'São Paulo, SP',
        data: 'Mar 2027', status: 'publicada', interesses: 8,
        criadaEm: '05 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#f093fb,#f5576c)',
        imagem_capa: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80', 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['corrida', 'maratona', 'atletas']
      },
      {
        id: 103, slug: 'ivete-sangalo-tour-2026', perfilSlug: 'instituto-esportivo',
        titulo: 'Ivete Sangalo — Tour Nacional 2026',
        categoria: 'Artista Musical',
        descricao: 'Tour nacional com 20 shows em 12 cidades. Público estimado de 500 mil pessoas.',
        cidade: 'Salvador, BA', localizacao: 'Salvador, BA',
        data: 'Jun–Nov 2026', status: 'publicada', interesses: 9,
        criadaEm: '08 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#3b1054,#6b21a8)',
        imagem_capa: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['música', 'show', 'tour']
      },
      {
        id: 104, slug: 'canal-desimpedidos-youtube', perfilSlug: 'instituto-esportivo',
        titulo: 'Canal Desimpedidos — YouTube',
        categoria: 'Mídia',
        descricao: 'O maior canal de futebol do Brasil com 7 milhões de inscritos e 50M de views/mês.',
        cidade: 'Online', localizacao: 'Online',
        data: 'Contínuo', status: 'publicada', interesses: 6,
        criadaEm: '10 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
        imagem_capa: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['mídia', 'youtube', 'futebol']
      },
      {
        id: 105, slug: 'rebeca-andrade-embaixadora', perfilSlug: 'instituto-esportivo',
        titulo: 'Rebeca Andrade — Embaixadora de Marca',
        categoria: 'Personalidade',
        descricao: 'Maior atleta olímpica do Brasil, com 100M+ de seguidores e alcance global.',
        cidade: 'São Paulo, SP', localizacao: 'São Paulo, SP',
        data: '2026–2028', status: 'publicada', interesses: 15,
        criadaEm: '12 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
        imagem_capa: 'https://images.unsplash.com/photo-1541872005-f00f59e27691?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1541872005-f00f59e27691?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['ginástica', 'olímpica', 'embaixadora']
      },
      {
        id: 106, slug: 'formula-e-sao-paulo', perfilSlug: 'instituto-esportivo',
        titulo: 'Fórmula E São Paulo',
        categoria: 'Evento',
        descricao: 'E-Prix de São Paulo — corrida de carros elétricos no coração da cidade.',
        cidade: 'São Paulo, SP', localizacao: 'São Paulo, SP',
        data: 'Jul 2026', status: 'rascunho', interesses: 0,
        criadaEm: '15 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#0D2137,#1A3A5C)',
        imagem_capa: null, imagens: [], imagens_focal: {}, visibilidade: 'publica', tags: ['automobilismo', 'elétrico']
      },
      {
        id: 107, slug: 'alok-dj-criador-de-conteudo', perfilSlug: 'instituto-esportivo',
        titulo: 'Alok — DJ & Criador de Conteúdo',
        categoria: 'Personalidade',
        descricao: 'DJ número 1 do Brasil com 35M+ de seguidores e presença global.',
        cidade: 'São Paulo, SP', localizacao: 'São Paulo, SP',
        data: '2026', status: 'publicada', interesses: 11,
        criadaEm: '18 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
        imagem_capa: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80', 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['dj', 'música', 'digital']
      },
      {
        id: 108, slug: 'podcast-flow-patrocinio', perfilSlug: 'instituto-esportivo',
        titulo: 'Podcast Flow — Patrocínio Mensal',
        categoria: 'Mídia',
        descricao: 'O maior podcast de esportes e cultura do Brasil. 3M ouvintes/mês.',
        cidade: 'Online', localizacao: 'Online',
        data: 'Contínuo', status: 'finalizada', interesses: 4,
        criadaEm: '20 mar 2026',
        bg_gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
        imagem_capa: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
        imagens: ['https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80'],
        imagens_focal: {}, visibilidade: 'publica', tags: ['podcast', 'esportes', 'áudio']
      }
    ],
    // Negociações (formato compatível com rowToNegociacao) — 20 negociações
    negociacoes: [
      // ── OPP 101: Rock in Rio ──
      { id: 'n1', _supaId: 'n1', opp_id: 101, opp: 'Rock in Rio — Cota Premium', categoria: 'Evento',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Patrocinador Premium', assunto: 'Proposta de patrocínio premium',
        valor: 'R$ 180.000', enviadaEm: '10/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: 'Aguardando assinatura',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 180000, propostoPor: 'marca', status: 'aceito' }, valor_deal: 180000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Nike Brasil',  texto: 'Temos grande interesse em ser o patrocinador premium do Rock in Rio.', data: '10/04 · 09:30' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Proposta aprovada! Vamos alinhar os próximos passos.', data: '11/04 · 14:15' }
        ],
        contrapartidas: [
          { id: 1, descricao: 'Naming rights palco principal',    categoria: 'branding', valor: 80000, prazo: '01/09/2026', status: 'aceita',   propostoPor: 'detentor' },
          { id: 2, descricao: 'Área de ativação 200m²',          categoria: 'ativacao', valor: 50000, prazo: '01/09/2026', status: 'aceita',   propostoPor: 'detentor' },
          { id: 3, descricao: 'Inserção em comunicações oficiais', categoria: 'midia',   valor: 30000, prazo: '15/08/2026', status: 'aceita',   propostoPor: 'marca' },
          { id: 4, descricao: 'Estúdio on-site',                  categoria: 'ativacao', valor: 20000, prazo: '01/09/2026', status: 'proposta', propostoPor: 'marca' }
        ]
      },
      { id: 'n2', _supaId: 'n2', opp_id: 101, opp: 'Rock in Rio — Cota Premium', categoria: 'Evento',
        marca: 'Ambev', marcaNome: 'Ambev', marca_id: 'm2', detentor_id: 'd1',
        cota: 'Parceiro Exclusivo de Bebidas', assunto: 'Parceria de bebidas oficial',
        valor: 'R$ 220.000', enviadaEm: '09/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 220000, propostoPor: 'detentor', status: 'aceito' }, valor_deal: 220000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Ambev',       texto: 'Queremos ser a cerveja oficial do festival. Proposta de R$ 220k.', data: '09/04 · 08:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Excelente! Ambev como beverage partner oficial. Aceito!', data: '09/04 · 15:30' }
        ],
        contrapartidas: [
          { id: 5, descricao: 'Exclusividade categoria bebidas', categoria: 'branding', valor: 120000, prazo: '01/09/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 6, descricao: '40 pontos de venda no evento',   categoria: 'ativacao', valor:  60000, prazo: '01/09/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 7, descricao: 'Branding em toda comunicação',   categoria: 'midia',    valor:  40000, prazo: '15/08/2026', status: 'aceita', propostoPor: 'marca' }
        ]
      },
      { id: 'n3', _supaId: 'n3', opp_id: 101, opp: 'Rock in Rio — Cota Premium', categoria: 'Evento',
        marca: 'Vivo', marcaNome: 'Vivo', marca_id: 'm3', detentor_id: 'd1',
        cota: 'Telecom Oficial', assunto: 'Conectividade oficial do festival',
        valor: 'R$ 160.000', enviadaEm: '07/04/2026',
        status: 'analise', statusLabel: 'Em análise', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Vivo',        texto: 'Gostaríamos de ser o telecom oficial, provendo Wi-Fi gratuito e ativações digitais.', data: '07/04 · 10:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Ótima proposta! Vamos avaliar e retornar em breve.', data: '08/04 · 09:00' }
        ],
        contrapartidas: [
          { id: 8, descricao: 'Wi-Fi gratuito para 100k visitantes', categoria: 'ativacao', valor: 80000, prazo: '01/09/2026', status: 'proposta', propostoPor: 'detentor' },
          { id: 9, descricao: 'Estande 5G Vivo on-site',             categoria: 'ativacao', valor: 80000, prazo: '01/09/2026', status: 'proposta', propostoPor: 'marca' }
        ]
      },
      { id: 'n4', _supaId: 'n4', opp_id: 101, opp: 'Rock in Rio — Cota Premium', categoria: 'Evento',
        marca: 'Nubank', marcaNome: 'Nubank', marca_id: 'm4', detentor_id: 'd1',
        cota: 'Fintech Oficial', assunto: 'Proposta fintech oficial',
        valor: 'R$ 140.000', enviadaEm: '05/04/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'Nubank', texto: 'O Rock in Rio é a plataforma perfeita para conectar nossa marca a um público jovem e engajado.', data: '05/04 · 15:00' }
        ],
        contrapartidas: []
      },
      // ── OPP 102: Maratona SP ──
      { id: 'n5', _supaId: 'n5', opp_id: 102, opp: 'Maratona Internacional SP 2026', categoria: 'Evento',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Patrocinador Oficial do Equipamento', assunto: 'Parceria calçados oficial',
        valor: 'R$ 50.000', enviadaEm: '08/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 50000, propostoPor: 'detentor', status: 'aceito' }, valor_deal: 50000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Nike Brasil',  texto: 'Parceiros históricos de maratonas, queremos fortalecer nossa presença na SP.', data: '08/04 · 11:20' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Nike é a parceira ideal! Proposta aceita.', data: '09/04 · 08:50' }
        ],
        contrapartidas: [
          { id: 10, descricao: 'Tênis oficial dos participantes',   categoria: 'branding', valor: 25000, prazo: '15/03/2027', status: 'aceita', propostoPor: 'marca' },
          { id: 11, descricao: 'Branding na linha de chegada',      categoria: 'branding', valor: 15000, prazo: '15/03/2027', status: 'aceita', propostoPor: 'detentor' },
          { id: 12, descricao: '10 posts Stories cobertura digital', categoria: 'digital',  valor: 10000, prazo: '20/03/2027', status: 'aceita', propostoPor: 'detentor' }
        ]
      },
      { id: 'n6', _supaId: 'n6', opp_id: 102, opp: 'Maratona Internacional SP 2026', categoria: 'Evento',
        marca: 'Gatorade', marcaNome: 'Gatorade', marca_id: 'm5', detentor_id: 'd1',
        cota: 'Parceiro Oficial de Hidratação', assunto: 'Hidratação oficial',
        valor: 'R$ 35.000', enviadaEm: '06/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 35000, propostoPor: 'detentor', status: 'aceito' }, valor_deal: 35000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Gatorade',    texto: 'Queremos os postos de hidratação exclusivos ao longo dos 42km.', data: '06/04 · 10:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Perfeito! Gatorade como hidratação oficial. Fechado!', data: '07/04 · 09:30' }
        ],
        contrapartidas: [
          { id: 13, descricao: '15 postos exclusivos ao longo da rota', categoria: 'ativacao', valor: 20000, prazo: '15/03/2027', status: 'aceita', propostoPor: 'detentor' },
          { id: 14, descricao: 'Kit Gatorade para os 35k participantes', categoria: 'branding', valor: 15000, prazo: '15/03/2027', status: 'aceita', propostoPor: 'marca' }
        ]
      },
      { id: 'n7', _supaId: 'n7', opp_id: 102, opp: 'Maratona Internacional SP 2026', categoria: 'Evento',
        marca: 'Itaú', marcaNome: 'Itaú', marca_id: 'm6', detentor_id: 'd1',
        cota: 'Banco Oficial', assunto: 'Banco oficial da maratona',
        valor: 'R$ 45.000', enviadaEm: '04/04/2026',
        status: 'analise', statusLabel: 'Em análise', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Itaú',        texto: 'O Itaú patrocina o esporte há décadas e queremos ser o banco oficial com ativações de pagamento digital.', data: '04/04 · 14:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Proposta muito boa! Estamos avaliando e retornamos esta semana.', data: '05/04 · 09:00' }
        ],
        contrapartidas: []
      },
      { id: 'n8', _supaId: 'n8', opp_id: 102, opp: 'Maratona Internacional SP 2026', categoria: 'Evento',
        marca: 'Adidas', marcaNome: 'Adidas', marca_id: 'm7', detentor_id: 'd1',
        cota: 'Patrocinador de Vestuário', assunto: 'Vestuário oficial da organização',
        valor: 'R$ 40.000', enviadaEm: '02/04/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'Adidas', texto: 'A Adidas quer vestir a equipe organizadora e todos os voluntários. Proposta de vestuário.', data: '02/04 · 16:30' }
        ],
        contrapartidas: []
      },
      // ── OPP 103: Ivete Sangalo ──
      { id: 'n9', _supaId: 'n9', opp_id: 103, opp: 'Ivete Sangalo — Tour Nacional 2026', categoria: 'Artista Musical',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Patrocínio de Tour', assunto: 'Patrocínio tour nacional',
        valor: 'R$ 130.000', enviadaEm: '05/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 130000, propostoPor: 'marca', status: 'aceito' }, valor_deal: 130000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Nike Brasil',       texto: 'A Ivete representa nossa energia e autenticidade. Queremos o tour completo.', data: '05/04 · 14:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Parceria incrível! Ivete adorou. Avançando com o contrato.', data: '06/04 · 09:30' }
        ],
        contrapartidas: [
          { id: 15, descricao: 'Logo Nike em todos os palcos',         categoria: 'branding', valor: 50000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 16, descricao: 'Ativação Nike Run em 5 cidades',       categoria: 'ativacao', valor: 40000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'marca' },
          { id: 17, descricao: '20 posts co-branded nas redes sociais', categoria: 'digital', valor: 40000, prazo: '30/11/2026', status: 'aceita', propostoPor: 'detentor' }
        ]
      },
      { id: 'n10', _supaId: 'n10', opp_id: 103, opp: 'Ivete Sangalo — Tour Nacional 2026', categoria: 'Artista Musical',
        marca: 'Natura', marcaNome: 'Natura', marca_id: 'm8', detentor_id: 'd1',
        cota: 'Parceira de Beleza e Bem-Estar', assunto: 'Parceria beleza oficial',
        valor: 'R$ 80.000', enviadaEm: '03/04/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 80000, propostoPor: 'detentor', status: 'aceito' }, valor_deal: 80000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Natura',              texto: 'Ivete é sinônimo de beleza e autenticidade. Queremos ser a parceira de beleza oficial.', data: '03/04 · 11:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Perfeito! Natura como parceira de beleza. Aceito!', data: '04/04 · 10:00' }
        ],
        contrapartidas: [
          { id: 18, descricao: 'Backstage Natura em todos os shows', categoria: 'ativacao', valor: 40000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 19, descricao: 'Kit Natura para fãs VIP',            categoria: 'branding', valor: 40000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'marca' }
        ]
      },
      { id: 'n11', _supaId: 'n11', opp_id: 103, opp: 'Ivete Sangalo — Tour Nacional 2026', categoria: 'Artista Musical',
        marca: 'iFood', marcaNome: 'iFood', marca_id: 'm9', detentor_id: 'd1',
        cota: 'Delivery Oficial', assunto: 'Delivery oficial dos shows',
        valor: 'R$ 55.000', enviadaEm: '01/04/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'iFood', texto: 'Queremos ser o delivery oficial. Podemos oferecer desconto exclusivo para os fãs do tour.', data: '01/04 · 13:30' }
        ],
        contrapartidas: []
      },
      // ── OPP 104: Desimpedidos ──
      { id: 'n12', _supaId: 'n12', opp_id: 104, opp: 'Canal Desimpedidos — YouTube', categoria: 'Mídia',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Patrocínio de Conteúdo', assunto: 'Patrocínio canal esportivo',
        valor: 'R$ 60.000', enviadaEm: '01/04/2026',
        status: 'analise', statusLabel: 'Em análise', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Nike Brasil',  texto: 'Desimpedidos tem o público alinhado ao nosso target. Proposta de 6 meses.', data: '01/04 · 10:15' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Estamos avaliando internamente. Retornamos em breve!', data: '02/04 · 16:30' }
        ],
        contrapartidas: [
          { id: 20, descricao: 'Menção em 24 vídeos (6 meses)', categoria: 'midia',   valor: 36000, prazo: '31/10/2026', status: 'proposta', propostoPor: 'detentor' },
          { id: 21, descricao: 'Vídeo exclusivo Nike x Desimpedidos', categoria: 'digital', valor: 24000, prazo: '31/10/2026', status: 'proposta', propostoPor: 'marca' }
        ]
      },
      { id: 'n13', _supaId: 'n13', opp_id: 104, opp: 'Canal Desimpedidos — YouTube', categoria: 'Mídia',
        marca: 'Brahma', marcaNome: 'Brahma', marca_id: 'm10', detentor_id: 'd1',
        cota: 'Patrocinador Master', assunto: 'Patrocínio master canal futebol',
        valor: 'R$ 90.000', enviadaEm: '30/03/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'Brahma', texto: 'Futebol é a nossa essência. Queremos ser o patrocinador master do Desimpedidos.', data: '30/03 · 15:00' }
        ],
        contrapartidas: []
      },
      // ── OPP 105: Rebeca Andrade ──
      { id: 'n14', _supaId: 'n14', opp_id: 105, opp: 'Rebeca Andrade — Embaixadora de Marca', categoria: 'Personalidade',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Embaixadora Global', assunto: 'Parceria embaixadora olímpica',
        valor: 'R$ 95.000', enviadaEm: '28/03/2026',
        status: 'pendente', statusLabel: 'Pendente', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca', nome: 'Nike Brasil', texto: 'Rebeca é a maior ginasta do Brasil. Queremos que ela seja embaixadora global para 2026-2028.', data: '28/03 · 09:00' }
        ],
        contrapartidas: []
      },
      { id: 'n15', _supaId: 'n15', opp_id: 105, opp: 'Rebeca Andrade — Embaixadora de Marca', categoria: 'Personalidade',
        marca: 'Netshoes', marcaNome: 'Netshoes', marca_id: 'm11', detentor_id: 'd1',
        cota: 'Embaixadora E-commerce', assunto: 'Parceria e-commerce esportes',
        valor: 'R$ 70.000', enviadaEm: '27/03/2026',
        status: 'analise', statusLabel: 'Em análise', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Netshoes',    texto: 'Rebeca poderia ser nossa embaixadora para a linha de ginástica olímpica.', data: '27/03 · 14:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Proposta interessante! Vamos avaliar com a equipe da Rebeca.', data: '28/03 · 10:30' }
        ],
        contrapartidas: []
      },
      // ── OPP 107: Alok ──
      { id: 'n16', _supaId: 'n16', opp_id: 107, opp: 'Alok — DJ & Criador de Conteúdo', categoria: 'Personalidade',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Parceria de Conteúdo Digital', assunto: 'Parceria global digital',
        valor: 'R$ 150.000', enviadaEm: '20/03/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: 150000, propostoPor: 'detentor', status: 'aceito' }, valor_deal: 150000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Nike Brasil',  texto: 'Alok tem audiência global jovem. Queremos parceria de conteúdo para festivais.', data: '20/03 · 11:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Parceria fechada! Vamos criar algo incrível.', data: '21/03 · 15:20' }
        ],
        contrapartidas: [
          { id: 22, descricao: 'Alok veste Nike em todos os shows 2026', categoria: 'branding', valor:  60000, prazo: '31/12/2026', status: 'aceita', propostoPor: 'detentor' },
          { id: 23, descricao: '12 posts co-branded Instagram + TikTok',  categoria: 'digital',  valor:  60000, prazo: '31/12/2026', status: 'aceita', propostoPor: 'marca' },
          { id: 24, descricao: 'Ativação Nike em festival do Alok',        categoria: 'ativacao', valor:  30000, prazo: '31/07/2026', status: 'aceita', propostoPor: 'marca' }
        ]
      },
      { id: 'n17', _supaId: 'n17', opp_id: 107, opp: 'Alok — DJ & Criador de Conteúdo', categoria: 'Personalidade',
        marca: 'Red Bull', marcaNome: 'Red Bull', marca_id: 'm12', detentor_id: 'd1',
        cota: 'Parceiro de Energia', assunto: 'Parceria energia e performance',
        valor: 'R$ 120.000', enviadaEm: '18/03/2026',
        status: 'analise', statusLabel: 'Em análise', statusHint: '',
        aceitaNovasPropostas: true,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Red Bull',    texto: 'Alok e Red Bull são sinônimos de energia. Parceria natural para festivais.', data: '18/03 · 10:30' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Proposta excelente! Avaliando as condições e retornamos.', data: '19/03 · 09:00' }
        ],
        contrapartidas: []
      },
      // ── OPP 108: Podcast Flow (encerrada) ──
      { id: 'n18', _supaId: 'n18', opp_id: 108, opp: 'Podcast Flow — Patrocínio Mensal', categoria: 'Mídia',
        marca: 'Nike Brasil', marcaNome: 'Nike Brasil', marca_id: 'm1', detentor_id: 'd1',
        cota: 'Patrocinador Sênior', assunto: 'Patrocínio podcast esportivo',
        valor: 'R$ 35.000', enviadaEm: '15/03/2026',
        status: 'recusada', statusLabel: 'Recusada', statusHint: 'Cota preenchida por outro parceiro',
        aceitaNovasPropostas: false,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Nike Brasil',  texto: 'Grande interesse no Flow Sports. Público muito alinhado.', data: '15/03 · 10:30' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Agradecemos o interesse! Cota já preenchida. Novas oportunidades em breve.', data: '16/03 · 09:00' }
        ],
        contrapartidas: []
      },
      { id: 'n19', _supaId: 'n19', opp_id: 108, opp: 'Podcast Flow — Patrocínio Mensal', categoria: 'Mídia',
        marca: 'Spotify', marcaNome: 'Spotify', marca_id: 'm13', detentor_id: 'd1',
        cota: 'Distribuição Oficial', assunto: 'Distribuição exclusiva',
        valor: 'R$ 45.000', enviadaEm: '10/03/2026',
        status: 'aceita', statusLabel: 'Aceita', statusHint: '',
        aceitaNovasPropostas: false,
        valorDeal: { proposto: 45000, propostoPor: 'detentor', status: 'aceito' }, valor_deal: 45000,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'Spotify',      texto: 'Queremos ter o Flow como podcast exclusivo na plataforma por 1 ano.', data: '10/03 · 11:00' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Parceria com Spotify é estratégica! Fechado!', data: '11/03 · 14:00' }
        ],
        contrapartidas: [
          { id: 25, descricao: 'Exclusividade Spotify por 12 meses', categoria: 'midia',   valor: 30000, prazo: '31/03/2027', status: 'aceita', propostoPor: 'detentor' },
          { id: 26, descricao: 'Feature na home do Spotify Brasil',  categoria: 'digital', valor: 15000, prazo: '01/06/2026', status: 'aceita', propostoPor: 'marca' }
        ]
      },
      { id: 'n20', _supaId: 'n20', opp_id: 108, opp: 'Podcast Flow — Patrocínio Mensal', categoria: 'Mídia',
        marca: 'XP Investimentos', marcaNome: 'XP Investimentos', marca_id: 'm14', detentor_id: 'd1',
        cota: 'Patrocinador Financeiro', assunto: 'Patrocínio fintech',
        valor: 'R$ 28.000', enviadaEm: '08/03/2026',
        status: 'recusada', statusLabel: 'Recusada', statusHint: 'Cota encerrada',
        aceitaNovasPropostas: false,
        valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' }, valor_deal: null,
        contrato_url: null, contrato_enviado_por: null, contrato_enviado_em: null,
        contrato_validado: false, contrato_validado_em: null, admin_comentario: null, campanha_id: null,
        thread: [
          { autor: 'marca',    nome: 'XP Investimentos', texto: 'Interesse em patrocinar segmento de finanças esportivas.', data: '08/03 · 09:30' },
          { autor: 'detentor', nome: 'Instituto Esportivo', texto: 'Agradecemos! Infelizmente a cota financeira já foi encerrada.', data: '09/03 · 10:00' }
        ],
        contrapartidas: []
      }
    ],
    kpis: {
      oportunidades_publicadas: 5,
      negociacoes_ativas: 20,
      deals_fechados: 7,
      receita_total: 615000
    }
  },

  // Taxa padrão da plataforma (20%)
  plataforma_taxa: 0.20
};

// ══════════════════════════════════════
//  CATÁLOGO PÚBLICO — 20 oportunidades nas 4 categorias
//  Usado em: dashboard-marca.html (Explorar), oportunidades.html
// ══════════════════════════════════════
window.CATALOG = [
  // ── PERSONALIDADE (5) ──
  {
    id: 201, slug: 'pele-jr-embaixador-esportivo', perfilSlug: 'instituto-esportivo',
    title: 'Pelé Jr. — Embaixador Esportivo', category: 'Personalidade',
    org: 'Pelé Sport & Business', orgInitials: 'PJ',
    detentorEmpresa: 'Pelé Sport & Business', detentorEmpresaDomain: 'pelesport.com.br',
    desc: 'Associe sua marca ao legado de Pelé através do filho. Ativações esportivas, palestras e conteúdo digital com alcance de 20M+ seguidores.',
    city: 'São Paulo', region: 'São Paulo', _alcance: '2026–2027', _price: 120000,
    _bgGradient: 'linear-gradient(135deg,#667eea,#764ba2)', _icon: '👤', _tags: ['esporte', 'futebol', 'legado'],
    _imagemCapa: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 202, slug: 'ana-marcela-cunha-natacao', perfilSlug: 'instituto-esportivo',
    title: 'Ana Marcela Cunha — Natação', category: 'Personalidade',
    org: 'AM Assessoria Esportiva', orgInitials: 'AM',
    detentorEmpresa: 'AM Assessoria Esportiva', detentorEmpresaDomain: 'amassessoria.com.br',
    desc: 'Campeã olímpica de maratona aquática. Embaixadora ideal para marcas de saúde, bem-estar e esporte de alto rendimento.',
    city: 'Rio de Janeiro', region: 'Rio de Janeiro', _alcance: '2026–2028', _price: 85000,
    _bgGradient: 'linear-gradient(135deg,#667eea,#764ba2)', _icon: '👤', _tags: ['natação', 'olimpíadas', 'embaixadora'],
    _imagemCapa: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 203, slug: 'alok-dj-criador-conteudo', perfilSlug: 'instituto-esportivo',
    title: 'Alok — DJ & Criador de Conteúdo', category: 'Personalidade',
    org: 'Alok Produções', orgInitials: 'AK',
    detentorEmpresa: 'Alok Produções', detentorEmpresaDomain: 'alok.com.br',
    desc: 'DJ número 1 do Brasil com 35M+ seguidores. Presença global em festivais como Tomorrowland, Coachella e Ultra.',
    city: 'São Paulo', region: 'São Paulo', _alcance: '2026', _price: 150000,
    _bgGradient: 'linear-gradient(135deg,#667eea,#764ba2)', _icon: '👤', _tags: ['dj', 'música', 'digital'],
    _imagemCapa: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 204, slug: 'rebeca-andrade-ginastica', perfilSlug: 'instituto-esportivo',
    title: 'Rebeca Andrade — Ginástica Olímpica', category: 'Personalidade',
    org: 'RA Management', orgInitials: 'RA',
    detentorEmpresa: 'RA Management', detentorEmpresaDomain: 'ramanagement.com.br',
    desc: 'Maior atleta olímpica do Brasil. Medalhas de ouro em Paris 2024. Alcance de 100M+ seguidores nas redes sociais.',
    city: 'Rio de Janeiro', region: 'Rio de Janeiro', _alcance: '2026–2028', _price: 95000,
    _bgGradient: 'linear-gradient(135deg,#667eea,#764ba2)', _icon: '👤', _tags: ['ginástica', 'olímpica', 'embaixadora'],
    _imagemCapa: 'https://images.unsplash.com/photo-1541872005-f00f59e27691?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1541872005-f00f59e27691?w=800&q=80',
      'https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 205, slug: 'joao-melo-influenciador-fitness', perfilSlug: 'instituto-esportivo',
    title: 'João Melo — Influenciador Fitness', category: 'Personalidade',
    org: 'JM Fit Studio', orgInitials: 'JM',
    detentorEmpresa: 'JM Fit Studio', detentorEmpresaDomain: 'jmfitstudio.com.br',
    desc: 'Maior influenciador fitness do Brasil com 8M seguidores. Conteúdo diário de treino, nutrição e lifestyle saudável.',
    city: 'Belo Horizonte', region: 'Minas Gerais', _alcance: 'Contínuo', _price: 45000,
    _bgGradient: 'linear-gradient(135deg,#667eea,#764ba2)', _icon: '👤', _tags: ['fitness', 'saúde', 'lifestyle'],
    _imagemCapa: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  // ── EVENTO (5) ──
  {
    id: 206, slug: 'maratona-internacional-sp-2027', perfilSlug: 'instituto-esportivo',
    title: 'Maratona Internacional SP 2027', category: 'Evento',
    org: 'SP Marathon Club', orgInitials: 'SM',
    detentorEmpresa: 'SP Marathon Club', detentorEmpresaDomain: 'spmarathon.com.br',
    desc: 'A maior maratona da América Latina com 35 mil atletas, cobertura nacional e internacional.',
    city: 'São Paulo', region: 'São Paulo', _alcance: 'Mar 2027', _price: 50000,
    _bgGradient: 'linear-gradient(135deg,#f093fb,#f5576c)', _icon: '🎪', _tags: ['corrida', 'maratona', 'atletas'],
    _imagemCapa: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
      'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=800&q=80',
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 207, slug: 'festival-verao-salvador-2027', perfilSlug: 'instituto-esportivo',
    title: 'Festival de Verão Salvador 2027', category: 'Evento',
    org: 'Verão Produções', orgInitials: 'VP',
    detentorEmpresa: 'Verão Produções', detentorEmpresaDomain: 'veraoBA.com.br',
    desc: 'O maior festival de verão do Brasil. 3 dias de shows, 120 mil pessoas e cobertura nacional.',
    city: 'Salvador', region: 'Bahia', _alcance: 'Fev 2027', _price: 80000,
    _bgGradient: 'linear-gradient(135deg,#f093fb,#f5576c)', _icon: '🎪', _tags: ['festival', 'verão', 'bahia'],
    _imagemCapa: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 208, slug: 'rock-in-rio-cota-patrocinio', perfilSlug: 'instituto-esportivo',
    title: 'Rock in Rio — Cota Patrocínio', category: 'Evento',
    org: 'Rock in Rio Entretenimento', orgInitials: 'RR',
    detentorEmpresa: 'Rock in Rio Entretenimento', detentorEmpresaDomain: 'rockinrio.com.br',
    desc: 'O maior festival de música do mundo. 700 mil pessoas em 7 dias. Cobertura em 190 países.',
    city: 'Rio de Janeiro', region: 'Rio de Janeiro', _alcance: 'Set 2026', _price: 180000,
    _bgGradient: 'linear-gradient(135deg,#f093fb,#f5576c)', _icon: '🎪', _tags: ['festival', 'rock', 'internacional'],
    _imagemCapa: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'aprovacao'
  },
  {
    id: 209, slug: 'formula-e-sao-paulo-2026', perfilSlug: 'instituto-esportivo',
    title: 'Fórmula E São Paulo 2026', category: 'Evento',
    org: 'Formula E Brasil', orgInitials: 'FE',
    detentorEmpresa: 'Formula E Brasil', detentorEmpresaDomain: 'formulaebrasil.com.br',
    desc: 'E-Prix de São Paulo. Corrida de carros elétricos no Anhembi com 80 mil espectadores.',
    city: 'São Paulo', region: 'São Paulo', _alcance: 'Jul 2026', _price: 240000,
    _bgGradient: 'linear-gradient(135deg,#f093fb,#f5576c)', _icon: '🎪', _tags: ['automobilismo', 'elétrico', 'sustentabilidade'],
    _imagemCapa: 'https://images.unsplash.com/photo-1520637836993-4dd8fc8f6e3e?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1520637836993-4dd8fc8f6e3e?w=800&q=80',
      'https://images.unsplash.com/photo-1504176090050-73ab8db45428?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'aprovacao'
  },
  {
    id: 210, slug: 'copa-interclubes-futebol', perfilSlug: 'instituto-esportivo',
    title: 'Copa Interclubes de Futebol', category: 'Evento',
    org: 'Copa Brasil Sports', orgInitials: 'CB',
    detentorEmpresa: 'Copa Brasil Sports', detentorEmpresaDomain: 'copabrasil.com.br',
    desc: 'Copa nacional com os 32 maiores clubes do Brasil. Transmissão em TV aberta e streaming para 20M espectadores.',
    city: 'Brasília', region: 'Distrito Federal', _alcance: 'Ago 2026', _price: 150000,
    _bgGradient: 'linear-gradient(135deg,#f093fb,#f5576c)', _icon: '🎪', _tags: ['futebol', 'copa', 'nacional'],
    _imagemCapa: 'https://images.unsplash.com/photo-1419232731818-4e40c4229d96?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1419232731818-4e40c4229d96?w=800&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  // ── ARTISTA MUSICAL (5) ──
  {
    id: 211, slug: 'ivete-sangalo-tour-nacional-2026', perfilSlug: 'instituto-esportivo',
    title: 'Ivete Sangalo — Tour Nacional 2026', category: 'Artista Musical',
    org: 'Sangalo Produções', orgInitials: 'IS',
    detentorEmpresa: 'Sangalo Produções', detentorEmpresaDomain: 'ivetesangalo.com.br',
    desc: 'Tour nacional com 20 shows em 12 cidades brasileiras. Público estimado de 500 mil pessoas.',
    city: 'Salvador', region: 'Bahia', _alcance: 'Jun–Nov 2026', _price: 130000,
    _bgGradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', _icon: '🎵', _tags: ['música', 'show', 'tour'],
    _imagemCapa: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 212, slug: 'ludmilla-projeto-numanice', perfilSlug: 'instituto-esportivo',
    title: 'Ludmilla — Projeto Numanice', category: 'Artista Musical',
    org: 'Bora Produções', orgInitials: 'LU',
    detentorEmpresa: 'Bora Produções', detentorEmpresaDomain: 'ludmilla.com.br',
    desc: 'Série de shows acústicos da Ludmilla. Baile funk e pagode para 15 cidades. Público premium classes A e B.',
    city: 'Rio de Janeiro', region: 'Rio de Janeiro', _alcance: 'Set–Dez 2026', _price: 90000,
    _bgGradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', _icon: '🎵', _tags: ['funk', 'pagode', 'acústico'],
    _imagemCapa: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 213, slug: 'gusttavo-lima-buteco-na-estrada', perfilSlug: 'instituto-esportivo',
    title: 'Gusttavo Lima — Buteco na Estrada', category: 'Artista Musical',
    org: 'GL Music', orgInitials: 'GL',
    detentorEmpresa: 'GL Music', detentorEmpresaDomain: 'gusttavolima.com.br',
    desc: 'A maior turnê sertaneja do Brasil com 50 shows em 30 estados. Público de 2 milhões de pessoas.',
    city: 'Goiânia', region: 'Goiás', _alcance: 'Jan–Dez 2026', _price: 110000,
    _bgGradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', _icon: '🎵', _tags: ['sertanejo', 'buteco', 'turnê'],
    _imagemCapa: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
      'https://images.unsplash.com/photo-1519671282429-b25b5c7e66e2?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 214, slug: 'wesley-safadao-verao-2026', perfilSlug: 'instituto-esportivo',
    title: 'Wesley Safadão — Verão 2026', category: 'Artista Musical',
    org: 'WS Produções', orgInitials: 'WS',
    detentorEmpresa: 'WS Produções', detentorEmpresaDomain: 'wesleysafadao.com.br',
    desc: 'O rei do forró com turnê de verão em 20 praias do Nordeste. 1 milhão de fãs esperados.',
    city: 'Fortaleza', region: 'Ceará', _alcance: 'Dez 2026–Mar 2027', _price: 75000,
    _bgGradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', _icon: '🎵', _tags: ['forró', 'verão', 'nordeste'],
    _imagemCapa: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 215, slug: 'luan-santana-arena-show-sp', perfilSlug: 'instituto-esportivo',
    title: 'Luan Santana — Arena Show SP', category: 'Artista Musical',
    org: 'LS Entretenimento', orgInitials: 'LS',
    detentorEmpresa: 'LS Entretenimento', detentorEmpresaDomain: 'luansantana.com.br',
    desc: 'Show especial no Allianz Parque para 45 mil pessoas com produção cinematográfica.',
    city: 'São Paulo', region: 'São Paulo', _alcance: 'Dez 2026', _price: 95000,
    _bgGradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', _icon: '🎵', _tags: ['sertanejo', 'arena', 'show'],
    _imagemCapa: 'https://images.unsplash.com/photo-1519671282429-b25b5c7e66e2?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1519671282429-b25b5c7e66e2?w=800&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  // ── MÍDIA (5) ──
  {
    id: 216, slug: 'podcast-flow-patrocinio-mensal', perfilSlug: 'instituto-esportivo',
    title: 'Podcast Flow — Patrocínio Mensal', category: 'Mídia',
    org: 'Flow Podcast', orgInitials: 'FP',
    detentorEmpresa: 'Flow Podcast', detentorEmpresaDomain: 'flowpodcast.com.br',
    desc: 'Maior podcast de esporte e cultura do Brasil. 3M de ouvintes/mês. Branded content de alta qualidade.',
    city: 'Online', region: 'Online', _alcance: 'Contínuo', _price: 35000,
    _bgGradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', _icon: '📡', _tags: ['podcast', 'esportes', 'áudio'],
    _imagemCapa: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 217, slug: 'canal-desimpedidos-youtube', perfilSlug: 'instituto-esportivo',
    title: 'Canal Desimpedidos — YouTube', category: 'Mídia',
    org: 'Desimpedidos Media', orgInitials: 'DM',
    detentorEmpresa: 'Desimpedidos Media', detentorEmpresaDomain: 'desimpedidos.com.br',
    desc: 'Maior canal de futebol do Brasil: 7M inscritos, 50M views/mês. Conteúdo viral e engajamento absurdo.',
    city: 'Online', region: 'Online', _alcance: 'Contínuo', _price: 60000,
    _bgGradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', _icon: '📡', _tags: ['youtube', 'futebol', 'digital'],
    _imagemCapa: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
      'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 218, slug: 'radio-jovem-pan-chamadas', perfilSlug: 'instituto-esportivo',
    title: 'Rádio Jovem Pan — Chamadas ao Vivo', category: 'Mídia',
    org: 'Jovem Pan', orgInitials: 'JP',
    detentorEmpresa: 'Jovem Pan', detentorEmpresaDomain: 'jovempan.com.br',
    desc: 'Maior rádio esportiva do Brasil. 12M ouvintes/dia. Chamadas e spots ao vivo nos programas.',
    city: 'São Paulo', region: 'São Paulo', _alcance: 'Contínuo', _price: 45000,
    _bgGradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', _icon: '📡', _tags: ['rádio', 'esportes', 'ao vivo'],
    _imagemCapa: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'publica'
  },
  {
    id: 219, slug: 'globo-esporte-insercao-vt', perfilSlug: 'instituto-esportivo',
    title: 'Globo Esporte — Inserção de VT', category: 'Mídia',
    org: 'Globo Esporte SP', orgInitials: 'GE',
    detentorEmpresa: 'Globo Esporte SP', detentorEmpresaDomain: 'globoesporte.com',
    desc: 'VT patrocinado no Globo Esporte SP — programa líder com 4M espectadores diários.',
    city: 'Rio de Janeiro', region: 'Rio de Janeiro', _alcance: 'Contínuo', _price: 220000,
    _bgGradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', _icon: '📡', _tags: ['tv', 'globo', 'esporte'],
    _imagemCapa: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80',
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'aprovacao'
  },
  {
    id: 220, slug: 'sportv-naming-rights-bloco', perfilSlug: 'instituto-esportivo',
    title: 'SporTV — Naming Rights de Bloco', category: 'Mídia',
    org: 'SporTV Globo', orgInitials: 'SV',
    detentorEmpresa: 'SporTV Globo', detentorEmpresaDomain: 'sportv.com.br',
    desc: 'Naming rights de bloco esportivo no SporTV com 2M espectadores/dia. Presença em 90 dias de programação.',
    city: 'Rio de Janeiro', region: 'Rio de Janeiro', _alcance: 'Contínuo', _price: 160000,
    _bgGradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', _icon: '📡', _tags: ['tv', 'sportv', 'naming rights'],
    _imagemCapa: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
      'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80'
    ], _imagensFocal: {}, visibilidade: 'aprovacao'
  }
];

// ════════════════════════════════════════════════════════════════════
//  ENRIQUECIMENTO RICO — adiciona campos completos para a página de detalhe
//  Cada opp recebe: descricao_completa (HTML rico), buscaMarca, entregas,
//  videoUrl, datasEvento, cotas_data (com fotos), publico_canais (rich),
//  publico_presencial, projetoIncentivado/incentivoData, linkExterno.
//
//  Visibilidades diversificadas: pública (60%), aprovação (25%), confidencial (15%).
// ════════════════════════════════════════════════════════════════════
(function _enrichOpps() {
  // ── Mapa de visibilidade por id (sobrescreve o que estiver no CATALOG) ──
  var VIS = {
    201: 'publica',     202: 'aprovacao',  203: 'publica',     204: 'convidadas', 205: 'publica',
    206: 'publica',     207: 'aprovacao',  208: 'aprovacao',   209: 'convidadas', 210: 'publica',
    211: 'publica',     212: 'aprovacao',  213: 'publica',     214: 'publica',    215: 'convidadas',
    216: 'publica',     217: 'publica',    218: 'aprovacao',   219: 'aprovacao',  220: 'aprovacao',
    // Detentor opps
    101: 'aprovacao', 102: 'publica',     103: 'publica',     104: 'publica',
    105: 'aprovacao', 106: 'publica',     107: 'convidadas',  108: 'publica'
  };

  // ── HTML descricao completa por categoria (rich content) ──
  function descPersonalidade(o) {
    return '<h3>Sobre o(a) embaixador(a)</h3>' +
      '<p>' + escapeHtmlD(o.title || o.titulo) + ' é uma das maiores referências do esporte e entretenimento brasileiro, com presença consolidada nas redes sociais e influência multigeracional. Esta parceria oferece à sua marca acesso direto a uma audiência altamente engajada e qualificada.</p>' +
      '<p>O contrato de embaixador(a) inclui presença em campanhas, eventos, conteúdo digital co-branded e ativações experienciais ao longo do ano.</p>' +
      '<h3>Por que apostar nessa parceria</h3>' +
      '<ul>' +
        '<li><strong>Alcance:</strong> mais de 30M de pessoas mensalmente entre redes sociais e mídia espontânea</li>' +
        '<li><strong>Engajamento:</strong> taxa média de 6.4%, 3x acima da mídia tradicional</li>' +
        '<li><strong>Brand fit:</strong> imagem associada a superação, autenticidade e conquistas</li>' +
        '<li><strong>Storytelling:</strong> trajetória de vida que ressoa com diferentes faixas etárias</li>' +
      '</ul>' +
      '<h3>Resultados de parcerias anteriores</h3>' +
      '<table><thead><tr><th>Marca</th><th>Período</th><th>Resultado</th></tr></thead><tbody>' +
        '<tr><td>Marca A</td><td>2024</td><td>+38% awareness</td></tr>' +
        '<tr><td>Marca B</td><td>2023</td><td>+22M impressões</td></tr>' +
        '<tr><td>Marca C</td><td>2022</td><td>ROI 4.2x</td></tr>' +
      '</tbody></table>';
  }
  function descEvento(o) {
    return '<h3>Sobre o evento</h3>' +
      '<p>' + escapeHtmlD(o.title || o.titulo) + ' é um dos eventos mais aguardados do calendário nacional. Realizado em ' + escapeHtmlD(o.city || o.cidade) + ', reúne público qualificado, cobertura midiática massiva e oportunidades únicas de ativação de marca.</p>' +
      '<p>Patrocinar este evento significa estar presente nos principais momentos vividos pelo público — antes, durante e depois — com retorno garantido em mídia espontânea, branded content e relacionamento direto com consumidores.</p>' +
      '<h3>Diferenciais</h3>' +
      '<ul>' +
        '<li><strong>Cobertura nacional:</strong> TV aberta, streaming, rádio e cobertura digital integrada</li>' +
        '<li><strong>Áreas de ativação:</strong> espaços exclusivos para sampling, experiência e branding</li>' +
        '<li><strong>Mídia espontânea estimada:</strong> R$ 8M+ em valor equivalente</li>' +
        '<li><strong>Ações pré e pós-evento:</strong> hub digital próprio com 2M+ visitas únicas</li>' +
      '</ul>' +
      '<h3>Edições anteriores em números</h3>' +
      '<table><thead><tr><th>Edição</th><th>Público</th><th>Mídia espontânea</th></tr></thead><tbody>' +
        '<tr><td>2024</td><td>110.000</td><td>R$ 6.8M</td></tr>' +
        '<tr><td>2023</td><td>95.000</td><td>R$ 5.2M</td></tr>' +
        '<tr><td>2022</td><td>72.000</td><td>R$ 3.4M</td></tr>' +
      '</tbody></table>';
  }
  function descArtista(o) {
    return '<h3>Sobre o artista</h3>' +
      '<p>' + escapeHtmlD(o.title || o.titulo) + ' é uma das maiores estrelas da música brasileira, com público fiel e enorme poder de influência sobre tendências de consumo. Esta parceria une sua marca à energia, emoção e proximidade que somente a música ao vivo proporciona.</p>' +
      '<p>O patrocínio inclui presença visual nos palcos, áreas de ativação, integração com fan experience, conteúdo audiovisual exclusivo e direitos de uso de imagem do artista nas comunicações.</p>' +
      '<h3>Pacote de ativações</h3>' +
      '<ul>' +
        '<li><strong>Branding nos palcos:</strong> backdrop, telões, identidade visual integrada</li>' +
        '<li><strong>VIP & camarim:</strong> experiência exclusiva para clientes e funcionários</li>' +
        '<li><strong>Conteúdo digital:</strong> 12 posts co-branded, 1 vídeo institucional do artista</li>' +
        '<li><strong>Meet & greet:</strong> 50 fãs por show, ação de relacionamento de marca</li>' +
      '</ul>' +
      '<h3>Audiência típica</h3>' +
      '<table><thead><tr><th>Métrica</th><th>Valor</th></tr></thead><tbody>' +
        '<tr><td>Público por show</td><td>15–45 mil</td></tr>' +
        '<tr><td>Cobertura digital</td><td>30M+ impressões</td></tr>' +
        '<tr><td>Engajamento médio</td><td>7.8%</td></tr>' +
      '</tbody></table>';
  }
  function descMidia(o) {
    return '<h3>Sobre o veículo</h3>' +
      '<p>' + escapeHtmlD(o.title || o.titulo) + ' é uma das maiores forças de comunicação do segmento, com audiência fidelizada e métricas de performance acima do mercado. Esta oportunidade entrega presença de marca de forma natural, contínua e relevante para o público certo.</p>' +
      '<p>Os formatos disponíveis combinam mídia tradicional, branded content, ativações ao vivo e integração com a comunidade da plataforma — gerando resultados consistentes e mensuráveis.</p>' +
      '<h3>Formatos disponíveis</h3>' +
      '<ul>' +
        '<li><strong>Inserções:</strong> spots, VTs, posts patrocinados em formatos nativos</li>' +
        '<li><strong>Branded content:</strong> peças co-criadas com o time editorial</li>' +
        '<li><strong>Naming rights:</strong> bloco, programa ou quadro com sua marca</li>' +
        '<li><strong>Ativações cross-channel:</strong> presença coordenada em todas as plataformas</li>' +
      '</ul>' +
      '<h3>Métricas de audiência</h3>' +
      '<table><thead><tr><th>KPI</th><th>Valor</th></tr></thead><tbody>' +
        '<tr><td>Audiência mensal</td><td>3M+ pessoas</td></tr>' +
        '<tr><td>Engajamento médio</td><td>5.6%</td></tr>' +
        '<tr><td>Taxa de retenção</td><td>78%</td></tr>' +
      '</tbody></table>';
  }

  function escapeHtmlD(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  // ── O que buscamos das marcas ──
  var BUSCA_BY_CAT = {
    'Personalidade':   'Marcas com posicionamento alinhado a superação, autenticidade e influência positiva. Procuramos parceiros que valorizem storytelling de longo prazo, integração orgânica de produto e construção conjunta de campanhas — não apenas presença de logo.',
    'Evento':          'Marcas que entendam o poder da experiência ao vivo e queiram protagonizar momentos memoráveis com o público. Buscamos parceiros estratégicos para ativações criativas, samplings, áreas exclusivas e integração com nossa cobertura digital antes, durante e depois do evento.',
    'Artista Musical': 'Marcas dispostas a explorar a música como ferramenta de conexão emocional e cultural. Procuramos parceiros que vão além da presença em palco e queiram cocriar conteúdo, ações de relacionamento e experiências para fãs.',
    'Mídia':           'Marcas com visão de longo prazo em construção de awareness e narrativa. Buscamos anunciantes que enxerguem branded content como ferramenta estratégica e queiram aproveitar nossa relação de confiança com o público para entregas qualitativas, não apenas alcance.'
  };

  // ── Entregas ao patrocinador ──
  var ENTREGAS_BY_CAT = {
    'Personalidade':   'Cota de Embaixador inclui:\n• 1 campanha audiovisual principal (60s + cortes para social)\n• 12 posts co-branded em redes sociais (Instagram, TikTok)\n• 4 ativações presenciais ao longo do ano\n• Direito de uso de imagem em mídia tradicional\n• 6 reuniões trimestrais de planejamento estratégico\n• Reporting mensal de performance e engajamento\n• Acesso a comunidade exclusiva de embaixadores\n• Time dedicado para curadoria e aprovações',
    'Evento':          'Cota de Patrocínio Premium inclui:\n• Naming rights ou exposição de marca em hierarquia premium\n• Ativação física exclusiva (até 200m²) em ponto nobre\n• Inserção em 100% dos materiais de comunicação\n• 200 ingressos VIP + 20 acessos backstage\n• Co-branding em peças audiovisuais oficiais\n• Cobertura na transmissão e em conteúdo pós-evento\n• Participação em coletivas e roda de imprensa\n• Reporting de audiência, mídia espontânea e ROI',
    'Artista Musical': 'Pacote completo de patrocínio inclui:\n• Branding integrado nos palcos da turnê\n• Meet & greet exclusivo (50 fãs por show)\n• Camarote para clientes e funcionários\n• 12 posts co-branded com aprovação do artista\n• 1 vídeo institucional gravado pelo artista\n• Direito de uso de imagem por 12 meses\n• Cobertura audiovisual de bastidores\n• Reporting completo de mídia espontânea e digital',
    'Mídia':           'Pacote contínuo de mídia inclui:\n• Inserções nativas no formato escolhido\n• Branded content cocriado com o time editorial\n• Naming rights de bloco, programa ou playlist\n• Distribuição cross-channel coordenada\n• Mensagem em comunidade exclusiva da plataforma\n• Reporting semanal de performance\n• Otimizações em tempo real conforme dados\n• Time dedicado de account management'
  };

  // ── Cotas data por categoria ──
  function buildCotas(cat, item) {
    var price = item._price || 80000;
    var img1 = (item.images && item.images[0]) || item._imagemCapa;
    var img2 = (item.images && item.images[1]) || img1;
    if (cat === 'Evento') {
      return [
        { nome: 'Patrocinador Master',  valor: price * 4, vagas: 1, beneficios: ['Naming rights do evento','Logo em todos os materiais','Área VIP exclusiva 300m²','100 ingressos VIP','Inserção na transmissão TV','Coletiva de imprensa exclusiva'], imagens: [img1, img2] },
        { nome: 'Patrocinador Premium', valor: price * 2, vagas: 3, beneficios: ['Logo em peças oficiais','Área de ativação 150m²','50 ingressos VIP','Citação em transmissão','Posts co-branded redes oficiais'], imagens: [img2] },
        { nome: 'Apoiador Oficial',     valor: Math.round(price * 0.6), vagas: 6, beneficios: ['Logo em backdrop','Estande de 30m²','15 ingressos cortesia','Menções nas redes sociais'], imagens: [img1] }
      ];
    }
    if (cat === 'Artista Musical') {
      return [
        { nome: 'Patrocinador Title',   valor: price * 3, vagas: 1, beneficios: ['Naming rights da turnê','Branding integrado nos palcos','Meet & greet exclusivo','Vídeo institucional do artista','Direito de imagem 12 meses','Camarote VIP em todos os shows'], imagens: [img1, img2] },
        { nome: 'Patrocinador Showcase',valor: price * 1.5, vagas: 4, beneficios: ['Logo em backdrop','12 posts co-branded','Camarote em 5 shows','Ações de sampling','Conteúdo de bastidores'], imagens: [img2] },
        { nome: 'Apoiador',             valor: Math.round(price * 0.5), vagas: 8, beneficios: ['Logo em telões','6 posts co-branded','Camarote em 2 shows'], imagens: [img1] }
      ];
    }
    if (cat === 'Personalidade') {
      return [
        { nome: 'Embaixador(a) Master', valor: price * 4, vagas: 1, beneficios: ['Exclusividade de categoria','Campanha audiovisual principal','12 posts co-branded','4 ativações presenciais','Direito de imagem em mídia trad.','Comunidade exclusiva'], imagens: [img1, img2] },
        { nome: 'Parceiro Selecionado', valor: price * 1.8, vagas: 3, beneficios: ['6 posts co-branded','2 ativações presenciais','Direito de imagem em campanha','Reporting trimestral'], imagens: [img2] },
        { nome: 'Patrocinador Pontual', valor: Math.round(price * 0.6), vagas: 6, beneficios: ['1 campanha digital','3 posts co-branded','1 ativação presencial'], imagens: [img1] }
      ];
    }
    // Mídia
    return [
      { nome: 'Naming Rights',       valor: price * 4, vagas: 1, beneficios: ['Nome da marca no programa/bloco','Inserção em 100% dos episódios','Branded content cocriado','Distribuição cross-channel','Account dedicado'], imagens: [img1, img2] },
      { nome: 'Patrocinador Plus',   valor: price * 1.8, vagas: 3, beneficios: ['Inserções nativas mensais','Branded content (4 peças/ano)','Mensagem em comunidade','Reporting mensal'], imagens: [img2] },
      { nome: 'Anunciante Premium',  valor: Math.round(price * 0.6), vagas: 5, beneficios: ['Inserções em 8 episódios','Posts em redes sociais','Reporting trimestral'], imagens: [img1] }
    ];
  }

  // ── Público canais (per-network rich data) ──
  function buildPublicoCanais(cat) {
    if (cat === 'Mídia' || cat === 'Personalidade' || cat === 'Artista Musical') {
      return {
        instagram: { network: 'instagram', tipo_dado: 'real', seguidores: 2400000, genero: { f: 58, m: 42 }, faixa_etaria: { '1317': 8, '1824': 28, '2534': 38, '3544': 18, '45p': 8 }, formatos: ['Reels','Carousel','Stories'], cidade: 'Brasil — capitais', periodo_referencia: 'mar/2026' },
        tiktok:    { network: 'tiktok', tipo_dado: 'real', seguidores: 1800000, genero: { f: 62, m: 38 }, faixa_etaria: { '1317': 18, '1824': 42, '2534': 24, '3544': 12, '45p': 4 }, formatos: ['Vídeo curto','Live'], cidade: 'Brasil', periodo_referencia: 'mar/2026' },
        youtube:   { network: 'youtube', tipo_dado: 'real', seguidores: 920000, genero: { f: 48, m: 52 }, faixa_etaria: { '1317': 6, '1824': 22, '2534': 36, '3544': 24, '45p': 12 }, formatos: ['Long-form','Shorts'], cidade: 'Brasil', periodo_referencia: 'mar/2026' }
      };
    }
    return {
      instagram: { network: 'instagram', tipo_dado: 'estimativa', seguidores: 480000, genero: { f: 54, m: 46 }, faixa_etaria: { '1824': 22, '2534': 38, '3544': 28, '45p': 12 }, formatos: ['Reels','Carousel'], cidade: 'Brasil', periodo_referencia: 'mar/2026' }
    };
  }

  // ── Público presencial (eventos) ──
  function buildPublicoPresencial(item) {
    return {
      tipo_dado: 'real',
      historico: '+85.000 pessoas (último ano)',
      perfil_socioeconomico: 'A/B (72%) e C (24%)',
      genero: { f: 52, m: 48 },
      faixa_etaria: { '1824': 22, '2534': 36, '3544': 24, '45p': 18 },
      contexto: 'Público formado por entusiastas, formadores de opinião e consumidores qualificados, com alta predisposição a experimentar marcas e adquirir produtos premium relacionados à temática do evento.',
      periodo_referencia: 'edição 2024'
    };
  }

  // ── Lei de incentivo (apenas para alguns) ──
  var INCENTIVO_IDS = {
    103: { lei_nome: 'Lei Rouanet (PRONAC)', categoria: 'Música', valor: 1500000, moeda: 'BRL', status: 'aprovado',     numero_pronac: '24-12345', validade: 'Dez/2026' },
    207: { lei_nome: 'Lei Paulo Gustavo',    categoria: 'Cultural', valor: 800000,  moeda: 'BRL', status: 'em_andamento', numero_pronac: 'LPG-2025-789', validade: 'Mar/2027' },
    208: { lei_nome: 'Lei Rouanet (PRONAC)', categoria: 'Música', valor: 2500000, moeda: 'BRL', status: 'aprovado',     numero_pronac: '24-67890', validade: 'Dez/2026' },
    211: { lei_nome: 'Lei Rouanet (PRONAC)', categoria: 'Música', valor: 1200000, moeda: 'BRL', status: 'aprovado',     numero_pronac: '24-22221', validade: 'Nov/2026' },
    212: { lei_nome: 'Lei de Incentivo ao Esporte', categoria: 'Cultural', valor: 600000, moeda: 'BRL', status: 'em_andamento', numero_pronac: 'LIE-2026-04', validade: 'Dez/2026' },
    215: { lei_nome: 'Lei Rouanet (PRONAC)', categoria: 'Música', valor: 900000,  moeda: 'BRL', status: 'aprovado',     numero_pronac: '25-44455', validade: 'Out/2026' }
  };

  // ── Vídeos de apresentação (YouTube) ──
  var VIDEO_BY_CAT = {
    'Personalidade':   'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    'Evento':          'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    'Artista Musical': 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    'Mídia':           'https://www.youtube.com/watch?v=jNQXAC9IVRw'
  };

  // ── Datas do evento (apenas categoria Evento) ──
  function buildDatas(item) {
    return [
      { data: item._alcance || item.data || 'A definir', local: (item.city || item.cidade || '') + ' — Local oficial' }
    ];
  }

  // ── Função principal de enriquecimento (mutates item) ──
  function enrich(item, opts) {
    opts = opts || {};
    var cat = item.category || item.categoria;
    var domain = item.detentorEmpresaDomain || 'institutoesportivo.com.br';
    var id = item.id;

    // Descricao completa rica
    var desc;
    if (cat === 'Personalidade')        desc = descPersonalidade(item);
    else if (cat === 'Evento')          desc = descEvento(item);
    else if (cat === 'Artista Musical') desc = descArtista(item);
    else                                desc = descMidia(item);

    // Aplica os campos ricos
    item.descricao_completa = desc;
    item.objetivos          = desc; // alias para o adapter
    item.buscaMarca         = BUSCA_BY_CAT[cat] || BUSCA_BY_CAT['Mídia'];
    item.entregas           = ENTREGAS_BY_CAT[cat] || ENTREGAS_BY_CAT['Mídia'];
    item.videoUrl           = VIDEO_BY_CAT[cat];
    item.video_url          = VIDEO_BY_CAT[cat];
    item.cotas_data         = buildCotas(cat, item);
    item.publico_canais     = buildPublicoCanais(cat);
    item.linkExterno        = 'https://' + domain;
    item.link_externo       = 'https://' + domain;
    item.formato            = (cat === 'Mídia') ? 'Digital' : 'Presencial + digital';
    item.preco_minimo       = item._price || 80000;
    item.cotas_habilitadas  = true;
    item.publico_descricao  = 'Público qualificado, altamente engajado e com forte presença digital. Perfil ideal para marcas que buscam relevância cultural, conexão autêntica e construção de narrativa de longo prazo.';

    // Eventos: datas + público presencial
    if (cat === 'Evento') {
      item.datas_evento     = buildDatas(item);
      item.datasEvento      = item.datas_evento;
      item.publico_presencial = buildPublicoPresencial(item);
    }

    // Lei de incentivo (apenas alguns ids)
    if (INCENTIVO_IDS[id]) {
      item.projeto_incentivado = true;
      item.projetoIncentivado  = true;
      item.incentivo_data      = INCENTIVO_IDS[id];
      item.incentivoData       = INCENTIVO_IDS[id];
    } else {
      item.projeto_incentivado = false;
      item.projetoIncentivado  = false;
    }

    // Visibilidade
    if (VIS[id]) item.visibilidade = VIS[id];

    // Garante alcance preenchido para opps de detentor (101-108)
    if (!item._alcance && item.data) item._alcance = item.data;
    if (!item.alcance && item.data) item.alcance = item.data;
  }

  if (window.CATALOG) window.CATALOG.forEach(function (it) { enrich(it); });
  if (window.DEMO && window.DEMO.detentor && window.DEMO.detentor.oportunidades) {
    window.DEMO.detentor.oportunidades.forEach(function (it) { enrich(it); });
  }

  console.log('[DemoData] Oportunidades enriquecidas com campos completos.');
})();
