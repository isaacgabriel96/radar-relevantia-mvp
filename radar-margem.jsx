
import { useState, useMemo } from "react";

const formatBRL = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const formatPct = (v) => `${v.toFixed(1)}%`;

const SIMPLES_FAIXAS = [
  { limite: 180000, aliquota: 0.06, deducao: 0 },
  { limite: 360000, aliquota: 0.112, deducao: 9360 },
  { limite: 720000, aliquota: 0.135, deducao: 17640 },
  { limite: 1800000, aliquota: 0.16, deducao: 35640 },
  { limite: 3600000, aliquota: 0.21, deducao: 125640 },
  { limite: 4800000, aliquota: 0.33, deducao: 648000 },
];

function calcSimples(receitaAnual) {
  const faixa = SIMPLES_FAIXAS.find((f) => receitaAnual <= f.limite) || SIMPLES_FAIXAS[5];
  const aliquotaEfetiva = (receitaAnual * faixa.aliquota - faixa.deducao) / receitaAnual;
  return Math.max(0, aliquotaEfetiva);
}

const TIERS = [
  { label: "Pequeno", min: 0, max: 50000, comissao: 22, cor: "#C9A43A" },
  { label: "Médio", min: 50000, max: 200000, comissao: 15, cor: "#E8C96A" },
  { label: "Grande", min: 200000, max: 500000, comissao: 10, cor: "#a07c20" },
  { label: "Enterprise", min: 500000, max: 9999999, comissao: 7, cor: "#7a5e10" },
];

export default function App() {
  const [dealsConfig, setDealsConfig] = useState([
    { qtd: 20, valorMedio: 30000 },
    { qtd: 8, valorMedio: 100000 },
    { qtd: 3, valorMedio: 300000 },
    { qtd: 1, valorMedio: 600000 },
  ]);
  const [assinaturas, setAssinaturas] = useState({ detentores: 40, marcas: 15 });
  const [precos, setPrecos] = useState({ detentor: 299, marca: 990 });
  const [custos, setCustos] = useState({ infra: 2500, moderacao: 8000, marketing: 5000, outros: 3000 });
  const [comissaoCustom, setComissaoCustom] = useState(null);
  const [tiers, setTiers] = useState(TIERS.map((t) => ({ ...t })));

  const getTierPorValor = (valor) => tiers.find((t) => valor <= t.max) || tiers[tiers.length - 1];

  const calculos = useMemo(() => {
    const recComissao = dealsConfig.reduce((acc, deal, i) => {
      const tier = getTierPorValor(deal.valorMedio);
      return acc + deal.qtd * deal.valorMedio * (tier.comissao / 100);
    }, 0);

    const recAssinaturas =
      (assinaturas.detentores * precos.detentor + assinaturas.marcas * precos.marca) * 12;

    const recBruta = recComissao + recAssinaturas;
    const aliquotaSimples = calcSimples(recBruta);
    const impostos = recBruta * aliquotaSimples;
    const recLiquida = recBruta - impostos;

    const custoTotal =
      (custos.infra + custos.moderacao + custos.marketing + custos.outros) * 12;

    const ebitda = recLiquida - custoTotal;
    const margemEbitda = recBruta > 0 ? ebitda / recBruta : 0;

    const dealsPorTier = dealsConfig.map((deal, i) => {
      const tier = getTierPorValor(deal.valorMedio);
      return {
        ...tier,
        qtd: deal.qtd,
        valorMedio: deal.valorMedio,
        volumeTotal: deal.qtd * deal.valorMedio,
        receita: deal.qtd * deal.valorMedio * (tier.comissao / 100),
      };
    });

    return {
      recComissao,
      recAssinaturas,
      recBruta,
      aliquotaSimples,
      impostos,
      recLiquida,
      custoTotal,
      ebitda,
      margemEbitda,
      dealsPorTier,
    };
  }, [dealsConfig, assinaturas, precos, custos, tiers]);

  const inputCls =
    "bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-[#C9A43A]";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0A0A0A", minHeight: "100vh", color: "#fff", padding: "24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#C9A43A", textTransform: "uppercase", marginBottom: 6 }}>
            Radar Relevantia
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, margin: 0 }}>
            Modelo de Margem & Pricing
          </h1>
          <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
            CNPJ em São Paulo · Simples Nacional Anexo III · ISS 2%
          </p>
        </div>

        {/* RESULTADO PRINCIPAL */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Receita Bruta Anual", val: formatBRL(calculos.recBruta), sub: "comissões + assinaturas" },
            { label: "Impostos (Simples)", val: formatBRL(calculos.impostos), sub: `alíquota efetiva ${formatPct(calculos.aliquotaSimples * 100)}` },
            { label: "Custos Operacionais", val: formatBRL(calculos.custoTotal), sub: "infra + equipe + marketing" },
            {
              label: "EBITDA",
              val: formatBRL(calculos.ebitda),
              sub: `margem ${formatPct(calculos.margemEbitda * 100)}`,
              highlight: calculos.ebitda > 0,
            },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                background: c.highlight ? "linear-gradient(135deg, #1a1400, #2a2000)" : "#111",
                border: `1px solid ${c.highlight ? "#C9A43A" : "#222"}`,
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.highlight ? "#E8C96A" : "#fff" }}>{c.val}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* WATERFALL */}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#C9A43A", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
            Waterfall de Receita
          </div>
          {[
            { label: "Receita de Comissões", val: calculos.recComissao, total: calculos.recBruta, cor: "#C9A43A" },
            { label: "Receita de Assinaturas", val: calculos.recAssinaturas, total: calculos.recBruta, cor: "#E8C96A" },
            { label: "(-) Impostos Simples SP", val: -calculos.impostos, total: calculos.recBruta, cor: "#ef4444" },
            { label: "(-) Infra & Tecnologia", val: -(custos.infra * 12), total: calculos.recBruta, cor: "#f97316" },
            { label: "(-) Moderação & Curadoria", val: -(custos.moderacao * 12), total: calculos.recBruta, cor: "#f97316" },
            { label: "(-) Marketing & CAC", val: -(custos.marketing * 12), total: calculos.recBruta, cor: "#f97316" },
            { label: "(-) Outros", val: -(custos.outros * 12), total: calculos.recBruta, cor: "#f97316" },
            { label: "= EBITDA", val: calculos.ebitda, total: calculos.recBruta, cor: calculos.ebitda > 0 ? "#22c55e" : "#ef4444", bold: true },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#ccc", width: 200, fontWeight: item.bold ? 700 : 400 }}>{item.label}</div>
              <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 4, height: 20, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.abs(item.val / item.total) * 100)}%`,
                    height: "100%",
                    background: item.cor,
                    opacity: 0.8,
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: item.cor, width: 100, textAlign: "right" }}>
                {formatBRL(item.val)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* TIERS DE COMISSÃO */}
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#C9A43A", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
              Tiers de Comissão
            </div>
            {tiers.map((tier, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#ccc" }}>
                    {tier.label}{" "}
                    <span style={{ color: "#555", fontSize: 11 }}>
                      (até {tier.max >= 9999999 ? "∞" : formatBRL(tier.max)})
                    </span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tier.cor }}>{tier.comissao}%</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={30}
                  value={tier.comissao}
                  onChange={(e) => {
                    const novo = [...tiers];
                    novo[i] = { ...novo[i], comissao: Number(e.target.value) };
                    setTiers(novo);
                  }}
                  style={{ width: "100%", accentColor: tier.cor }}
                />
              </div>
            ))}
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#1a1a1a", borderRadius: 6, fontSize: 11, color: "#888", lineHeight: 1.6 }}>
              <strong style={{ color: "#C9A43A" }}>Referência mercado:</strong> Agências tradicionais cobram 15% fixo. SponsorUnited é subscription-only. Comissão de 20% em deals pequenos é defensável; acima de R$200k, 10-12% é o teto aceitável.
            </div>
          </div>

          {/* DEALS POR TIER */}
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#C9A43A", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
              Volume de Deals (Anual)
            </div>
            {dealsConfig.map((deal, i) => {
              const tier = getTierPorValor(deal.valorMedio);
              return (
                <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < 3 ? "1px solid #1a1a1a" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: tier.cor, background: "#1a1a1a", padding: "2px 8px", borderRadius: 20 }}>
                      {tier.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#555" }}>comissão {tier.comissao}%</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", marginBottom: 3 }}>Qtd deals</div>
                      <input
                        type="number"
                        min={0}
                        value={deal.qtd}
                        onChange={(e) => {
                          const n = [...dealsConfig];
                          n[i] = { ...n[i], qtd: Number(e.target.value) };
                          setDealsConfig(n);
                        }}
                        className={inputCls}
                        style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", color: "#fff", width: "100%", fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", marginBottom: 3 }}>Valor médio (R$)</div>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={deal.valorMedio}
                        onChange={(e) => {
                          const n = [...dealsConfig];
                          n[i] = { ...n[i], valorMedio: Number(e.target.value) };
                          setDealsConfig(n);
                        }}
                        style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", color: "#fff", width: "100%", fontSize: 13 }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 5 }}>
                    Receita: <span style={{ color: tier.cor }}>{formatBRL(deal.qtd * deal.valorMedio * (tier.comissao / 100))}</span>
                    {" "}· Volume total: {formatBRL(deal.qtd * deal.valorMedio)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ASSINATURAS + CUSTOS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#C9A43A", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
              Assinaturas (MRR → ARR)
            </div>
            {[
              { label: "Detentores de ativos (R$/mês)", key: "detentor", stateKey: "detentores", icon: "🏟" },
              { label: "Marcas (R$/mês)", key: "marca", stateKey: "marcas", icon: "🏷" },
            ].map((item) => (
              <div key={item.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{item.icon} {item.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 3 }}>Clientes ativos</div>
                    <input
                      type="number"
                      value={assinaturas[item.stateKey]}
                      onChange={(e) => setAssinaturas((p) => ({ ...p, [item.stateKey]: Number(e.target.value) }))}
                      style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", color: "#fff", width: "100%", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 3 }}>Preço mensal (R$)</div>
                    <input
                      type="number"
                      value={precos[item.key]}
                      onChange={(e) => setPrecos((p) => ({ ...p, [item.key]: Number(e.target.value) }))}
                      style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", color: "#fff", width: "100%", fontSize: 13 }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#C9A43A", marginTop: 5 }}>
                  ARR: {formatBRL(assinaturas[item.stateKey] * precos[item.key] * 12)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#C9A43A", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
              Custos Mensais
            </div>
            {[
              { label: "Infra & Tecnologia", key: "infra", hint: "Netlify, Supabase, domínios" },
              { label: "Moderação & Curadoria", key: "moderacao", hint: "Custo de revisão de perfis" },
              { label: "Marketing & CAC", key: "marketing", hint: "Aquisição de clientes" },
              { label: "Outros (jurídico, etc)", key: "outros", hint: "Contador, contratos" },
            ].map((c) => (
              <div key={c.key} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "#ccc" }}>{c.label}</span>
                  <span style={{ fontSize: 10, color: "#555" }}>{c.hint}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#555" }}>R$</span>
                  <input
                    type="number"
                    value={custos[c.key]}
                    onChange={(e) => setCustos((p) => ({ ...p, [c.key]: Number(e.target.value) }))}
                    style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", color: "#fff", width: "100%", fontSize: 13 }}
                  />
                  <span style={{ fontSize: 10, color: "#888" }}>/mês</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#888" }}>Total anual</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>{formatBRL(calculos.custoTotal)}</span>
            </div>
          </div>
        </div>

        {/* NOTA FISCAL E IMPOSTOS SP */}
        <div style={{ background: "#111", border: "1px solid #C9A43A33", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, color: "#C9A43A", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
            Tributação · São Paulo · Simples Nacional Anexo III
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "ISS (São Paulo)", val: "2%", sub: "código 1.05 e serviços de intermediação tech — melhor municipio do Brasil para SaaS", destaque: true },
              { label: "Faixa Simples atual", val: calculos.recBruta <= 180000 ? "Faixa 1" : calculos.recBruta <= 360000 ? "Faixa 2" : calculos.recBruta <= 720000 ? "Faixa 3" : "Faixa 4+", sub: `alíquota efetiva ${formatPct(calculos.aliquotaSimples * 100)}` },
              { label: "Exportação de serviços", val: "ISS 0% + PIS/COFINS 0%", sub: "receitas de clientes no exterior (emitir NFS-e como exportação)" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#1a1a1a", borderRadius: 8, padding: "12px 14px", border: item.destaque ? "1px solid #C9A43A44" : "1px solid #222" }}>
                <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.destaque ? "#E8C96A" : "#fff", marginBottom: 4 }}>{item.val}</div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#555", lineHeight: 1.7 }}>
            <strong style={{ color: "#888" }}>Para investidores:</strong> "Nossa estrutura tributária opera no regime mais eficiente disponível para plataformas SaaS no Brasil. São Paulo tem o menor ISS municipal para tecnologia (2%), e receitas de clientes internacionais são isentas de ISS e PIS/COFINS, preservando margem em expansão internacional."
          </div>
        </div>
      </div>
    </div>
  );
}
