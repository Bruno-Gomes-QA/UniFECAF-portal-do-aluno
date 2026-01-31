# PR13 — Regras + agregações (cálculos, consistência e queries)

## Objetivo
Consolidar regras do domínio e otimizar endpoints:
- cálculo de faltas (% com 2 casas)
- nota final 0..10 com 2 casas
- geração de sessões a partir de meetings
- queries eficientes para summaries

---

## Itens

### Cálculo de faltas
- `absences_count`: count(ABSENT)
- `absences_pct`: (absences_count / total_sessions) * 100 (Decimal 2 casas)

### Nota final
- opção simples: manual em `final_grades.final_score`
- opção robusta: cálculo por assessments (weight)
- recomendação: fornecer endpoint admin “recalculate”

### Geração de sessões
- `POST /api/v1/admin/terms/{term_id}/generate-sessions`
  - cria class_sessions entre date_from/date_to
  - evita duplicar (unique constraint)

### today-class robusto
- se >1 por inconsistência: escolher mais cedo + warnings

---

## Testes
- cálculo de % faltas em dataset mínimo
- geração de sessões não duplica
- today-class warnings quando necessário

---

## Critérios de aceite
- summaries consistentes
- Decimal 2 casas
- regra 1 aula/dia reforçada
