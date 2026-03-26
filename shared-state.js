/**
 * shared-state.js — Radar Relevantia MVP
 * Fonte única de verdade para NEGOCIACOES.
 * Persiste em localStorage para sincronizar dashboard-marca ↔ dashboard-detentor.
 *
 * Uso:
 *   SharedNeg.all()              → retorna o array completo
 *   SharedNeg.byMarca(marcaId)   → retorna negs de uma marca específica
 *   SharedNeg.find(id)           → encontra uma negociação por id
 *   SharedNeg.save()             → persiste estado atual em localStorage
 *   SharedNeg.reset()            → volta aos dados iniciais (dev helper)
 */
(function(global) {

  const STORAGE_KEY = 'rr_negociacoes_v1';

  // ─── DADOS INICIAIS ──────────────────────────────────────────────────────────
  // Fonte de verdade: todos os dados de negociação de ambos os dashboards unificados.
  // Cada negociação tem `marca_id` que identifica de qual marca é.
  const INITIAL_DATA = [
    // ── opp_id: 1 — Maratona Internacional SP 2026 ───────────────────────────
    {
      id: 1, opp_id: 1, marca_id: 'nike-brasil',
      opp: 'Maratona Internacional SP 2026',
      marca: 'Nike Brasil', cota: 'Patrocinador Premium',
      assunto: 'Quero negociar esta cota',
      valor: 'R$ 55.000', enviadaEm: '15/03/2026',
      status: 'pendente', statusLabel: 'Pendente',
      statusHint: 'Aguardando retorno do organizador',
      thread: [
        { autor:'marca', nome:'Nike Brasil', texto:'Temos grande interesse em fortalecer nossa presença neste evento. Gostaríamos de entender os entregáveis e condições de pagamento.', data:'15/03 · 10:22' }
      ],
      aceitaNovasPropostas: true,
      valorDeal: { proposto: null, propostoPor: null, status: 'sem_proposta' },
      contrapartidas: [
        { id:1, descricao:'Logo na largada e chegada',   categoria:'branding', valor:18000, prazo:'20/04/2026', status:'proposta', propostoPor:'marca' },
        { id:2, descricao:'Estande de ativação 4m²',     categoria:'ativacao', valor:12000, prazo:'20/04/2026', status:'proposta', propostoPor:'detentor' }
      ]
    },
    {
      id: 2, opp_id: 1, marca_id: 'adidas-brasil',
      opp: 'Maratona Internacional SP 2026',
      marca: 'Adidas Brasil', cota: 'Patrocinador Oficial',
      assunto: 'Gostaria de fazer uma proposta',
      valor: 'R$ 70.000', enviadaEm: '14/03/2026',
      status: 'aceita', statusLabel: 'Aceita',
      statusHint: 'Proposta aprovada pelo organizador',
      thread: [
        { autor:'marca',    nome:'Adidas Brasil',         texto:'Podemos oferecer contrapartidas adicionais de mídia digital.', data:'14/03 · 09:00' },
        { autor:'detentor', nome:'Maratona Internacional', texto:'Olá Adidas! Sua proposta foi aceita. Vamos alinhar os detalhes do contrato.', data:'15/03 · 11:30' }
      ],
      contrapartidas: [
        { id:1, descricao:'Branding nas camisetas oficiais', categoria:'branding', valor:25000, prazo:'20/04/2026', status:'aceita',   propostoPor:'marca' },
        { id:2, descricao:'Cobertura digital (5 posts)',     categoria:'digital',  valor:10000, prazo:'01/05/2026', status:'aceita',   propostoPor:'detentor' },
        { id:3, descricao:'Totem 3D no expo center',         categoria:'ativacao', valor: 8000, prazo:'20/04/2026', status:'recusada', propostoPor:'marca' }
      ]
    },
    {
      id: 3, opp_id: 1, marca_id: 'gatorade',
      opp: 'Maratona Internacional SP 2026',
      marca: 'Gatorade', cota: 'Cota Saúde',
      assunto: 'Tenho interesse, mas preciso de mais informações',
      valor: 'R$ 30.000', enviadaEm: '13/03/2026',
      status: 'analise', statusLabel: 'Em análise',
      statusHint: 'O time da Relevantia está avaliando',
      thread: [
        { autor:'marca', nome:'Gatorade', texto:'Gostaríamos de entender melhor o perfil de público e as cotas de ativação disponíveis na área de hidratação.', data:'13/03 · 14:10' }
      ],
      contrapartidas: [
        { id:1, descricao:'Posto de hidratação exclusivo', categoria:'ativacao', valor:15000, prazo:'20/04/2026', status:'proposta', propostoPor:'detentor' }
      ]
    },
    {
      id: 4, opp_id: 1, marca_id: 'new-balance',
      opp: 'Maratona Internacional SP 2026',
      marca: 'New Balance', cota: 'Patrocinador Premium',
      assunto: 'Quero negociar esta cota',
      valor: 'R$ 55.000', enviadaEm: '12/03/2026',
      status: 'pendente', statusLabel: 'Pendente',
      statusHint: 'Aguardando retorno do organizador',
      thread: [
        { autor:'marca', nome:'New Balance', texto:'Somos parceiros históricos de maratonas no Brasil e gostaríamos de manter essa tradição aqui.', data:'12/03 · 08:45' }
      ],
      contrapartidas: []
    },
    {
      id: 5, opp_id: 1, marca_id: 'under-armour',
      opp: 'Maratona Internacional SP 2026',
      marca: 'Under Armour', cota: 'Patrocinador Oficial',
      assunto: 'Gostaria de fazer uma proposta',
      valor: 'R$ 40.000', enviadaEm: '11/03/2026',
      status: 'recusada', statusLabel: 'Recusada',
      statusHint: 'Não foi possível avançar neste momento',
      thread: [
        { autor:'marca',    nome:'Under Armour',           texto:'Gostaríamos de negociar esta cota. Temos flexibilidade em valores e ativações.', data:'11/03 · 16:00' },
        { autor:'detentor', nome:'Maratona Internacional', texto:'Agradecemos o interesse, mas a cota foi reservada para outro parceiro. Entraremos em contato em futuras edições.', data:'12/03 · 09:20' }
      ],
      contrapartidas: []
    },

    // ── opp_id: 2 — Festival Cultura Viva 2026 / Festival de Verão Salvador ──
    {
      id: 6, opp_id: 2, marca_id: 'nike-brasil',
      opp: 'Festival de Verão Salvador',
      marca: 'Nike Brasil', cota: 'Patrocinador Master',
      assunto: 'Gostaria de fazer uma proposta',
      valor: 'R$ 90.000', enviadaEm: '12/03/2026',
      status: 'aceita', statusLabel: 'Aceita',
      statusHint: 'Proposta aprovada pelo organizador',
      thread: [
        { autor:'marca',    nome:'Nike Brasil',               texto:'Acreditamos que nossa marca tem alto alinhamento com o público do festival. Enviamos uma proposta formal para análise.', data:'12/03 · 09:15' },
        { autor:'detentor', nome:'Festival de Verão Salvador', texto:'Olá! Recebemos sua proposta e ficamos muito animados com o potencial desta parceria. Vamos alinhar os detalhes em breve.', data:'13/03 · 14:40' },
        { autor:'marca',    nome:'Nike Brasil',               texto:'Ótimo! Podemos agendar uma call para a próxima semana?', data:'13/03 · 16:05' }
      ],
      contrapartidas: [
        { id:1, descricao:'Logo na camiseta oficial',       categoria:'branding', valor:15000, prazo:'30/04/2026', status:'aceita',   propostoPor:'marca' },
        { id:2, descricao:'Estande 6m² no palco principal', categoria:'ativacao', valor:30000, prazo:'20/05/2026', status:'aceita',   propostoPor:'detentor' },
        { id:3, descricao:'Menção em redes sociais (5x)',   categoria:'digital',  valor: 8000, prazo:'01/05/2026', status:'recusada', propostoPor:'marca' },
        { id:4, descricao:'Banner LED no palco',            categoria:'midia',    valor:12000, prazo:'20/05/2026', status:'proposta', propostoPor:'detentor' }
      ]
    },
    {
      id: 7, opp_id: 2, marca_id: 'natura',
      opp: 'Festival de Verão Salvador',
      marca: 'Natura', cota: 'Patrocínio Cultural',
      assunto: 'Quero entender as possibilidades',
      valor: 'R$ 50.000', enviadaEm: '10/03/2026',
      status: 'pendente', statusLabel: 'Pendente',
      statusHint: 'Aguardando retorno do organizador',
      thread: [
        { autor:'marca', nome:'Natura', texto:'Temos interesse em associar nossa marca a eventos culturais de impacto. Quais são as possibilidades de ativação?', data:'10/03 · 11:55' }
      ],
      contrapartidas: [
        { id:1, descricao:'Logo no cenário principal', categoria:'branding', valor:20000, prazo:'10/06/2026', status:'proposta', propostoPor:'detentor' }
      ]
    },
    {
      id: 8, opp_id: 2, marca_id: 'itau-cultural',
      opp: 'Festival de Verão Salvador',
      marca: 'Itaú Cultural', cota: 'Patrocínio Cultural',
      assunto: 'Gostaria de fazer uma proposta',
      valor: 'R$ 80.000', enviadaEm: '09/03/2026',
      status: 'aceita', statusLabel: 'Aceita',
      statusHint: 'Proposta aprovada pelo organizador',
      thread: [
        { autor:'marca',    nome:'Itaú Cultural',         texto:'Buscamos parceiros alinhados ao nosso posicionamento cultural. Podemos conversar sobre o projeto?', data:'09/03 · 14:30' },
        { autor:'detentor', nome:'Festival de Verão Salvador', texto:'Com certeza! A proposta do Itaú Cultural está aprovada. Vamos agendar uma reunião de alinhamento.', data:'10/03 · 10:05' }
      ],
      contrapartidas: [
        { id:1, descricao:'Naming rights do palco principal', categoria:'branding', valor:40000, prazo:'10/06/2026', status:'aceita', propostoPor:'detentor' },
        { id:2, descricao:'Cobertura no app do festival',     categoria:'digital',  valor:15000, prazo:'01/06/2026', status:'aceita', propostoPor:'marca'    }
      ]
    },
    {
      id: 9, opp_id: 2, marca_id: 'vivo',
      opp: 'Festival de Verão Salvador',
      marca: 'Vivo', cota: 'Naming Rights',
      assunto: 'Quero entender as possibilidades',
      valor: 'R$ 120.000', enviadaEm: '08/03/2026',
      status: 'analise', statusLabel: 'Em análise',
      statusHint: 'O time da Relevantia está avaliando',
      thread: [
        { autor:'marca',    nome:'Vivo',                       texto:'Gostaríamos de explorar o naming rights do festival. Qual o valor e os entregáveis previstos?', data:'08/03 · 15:00' },
        { autor:'detentor', nome:'Festival de Verão Salvador', texto:'Olá Vivo! Estamos preparando um dossiê completo sobre o naming rights. Enviaremos em breve.', data:'09/03 · 09:40' }
      ],
      contrapartidas: [
        { id:1, descricao:'Naming rights + cobertura digital', categoria:'midia', valor:60000, prazo:'10/06/2026', status:'proposta', propostoPor:'detentor' }
      ]
    },

    // ── opp_id: 3 — Expo Tech Brasil ─────────────────────────────────────────
    {
      id: 10, opp_id: 3, marca_id: 'nike-brasil',
      opp: 'Expo Tech Brasil',
      marca: 'Nike Brasil', cota: 'Apoiador Oficial',
      assunto: 'Tenho interesse, mas preciso de mais informações',
      valor: 'R$ 40.000', enviadaEm: '10/03/2026',
      status: 'analise', statusLabel: 'Em análise',
      statusHint: 'O time da Relevantia está avaliando',
      thread: [
        { autor:'marca',    nome:'Nike Brasil',  texto:'Precisamos entender melhor os dados de público e os entregáveis antes de avançar com a proposta.', data:'10/03 · 11:30' },
        { autor:'detentor', nome:'Expo Tech BR', texto:'Claro! Temos um media kit completo. Posso te enviar por aqui ou prefere por e-mail?', data:'11/03 · 08:55' }
      ],
      contrapartidas: [
        { id:1, descricao:'Logo no backdrop do evento', categoria:'branding', valor:10000, prazo:'05/06/2026', status:'proposta', propostoPor:'marca' }
      ]
    },

    // ── opp_id: 4 — Arena Music Curitiba ─────────────────────────────────────
    {
      id: 11, opp_id: 4, marca_id: 'nike-brasil',
      opp: 'Arena Music Curitiba',
      marca: 'Nike Brasil', cota: 'Patrocinador Premium',
      assunto: 'Quero negociar esta cota',
      valor: 'R$ 65.000', enviadaEm: '05/03/2026',
      status: 'recusada', statusLabel: 'Recusada',
      statusHint: 'Não foi possível avançar neste momento',
      thread: [
        { autor:'marca',    nome:'Nike Brasil',          texto:'Gostaríamos de negociar essa cota. Temos flexibilidade nos valores e nos entregáveis.', data:'05/03 · 13:00' },
        { autor:'detentor', nome:'Arena Music Curitiba', texto:'Agradecemos o interesse, mas a cota já foi fechada com outro parceiro. Manteremos contato para futuras edições.', data:'07/03 · 10:15' }
      ],
      contrapartidas: []
    }
  ];

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  // ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
  // Carrega do localStorage ou usa dados iniciais
  let _data = load() || JSON.parse(JSON.stringify(INITIAL_DATA));

  // ─── API PÚBLICA ──────────────────────────────────────────────────────────────
  global.SharedNeg = {
    /** Retorna array completo de negociações */
    all: function() { return _data; },

    /** Retorna negociações de uma marca específica */
    byMarca: function(marcaId) {
      return _data.filter(function(n) { return n.marca_id === marcaId; });
    },

    /** Encontra uma negociação pelo id */
    find: function(id) {
      return _data.find(function(n) { return n.id === id; });
    },

    /** Persiste estado atual no localStorage */
    save: function() {
      save(_data);
    },

    /** Reseta para dados iniciais (útil para demos) */
    reset: function() {
      _data = JSON.parse(JSON.stringify(INITIAL_DATA));
      save(_data);
      return _data;
    },

    /** Retorna dados iniciais sem modificar estado */
    initialData: function() {
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  };

})(window);
