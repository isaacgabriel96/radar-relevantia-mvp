/**
 * shared-state.js — Radar Relevantia MVP
 *
 * LEGACY: Dados de fallback/demo para negociações.
 * Usado como fallback quando Supabase está indisponível.
 * Será removido quando offline mode for implementado.
 *
 * Fonte única de verdade para NEGOCIACOES (fallback).
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
  // LEGADO: array vazio — dados reais vêm do Supabase.
  // Mantido apenas para compatibilidade com reset() e initialData().
  const INITIAL_DATA = [];

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
