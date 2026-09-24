# Auditoria de integração com o backend Sinaliza

## Backend encontrado

Nenhum repositório/backend Sinaliza está disponível neste workspace. Portanto não é possível afirmar stack, ORM, banco, entidades, controllers ou rotas reais sem inventar estrutura.

## Estado da IA

- `ClassificationPreviewService` já recebe somente `{ description }`.
- O serviço consulta um `SectorProvider`, valida setores ativos e bloqueia IDs existentes no backend mas ausentes no modelo.
- `MockSectorProvider` e `FileSectorProvider` existem; o adapter HTTP/DB real ainda não foi implementado porque o contrato concreto do backend não foi fornecido.
- `FeedbackRepository` local preserva texto, setor previsto, setor corrigido, origem e versão; não retreina automaticamente.

## Contrato preparado

Fluxo esperado: `POST /classification/preview` → `ClassificationPreviewService.preview({ description })` → `sector_id` → backend valida setor ativo → `automatic_sector`.

## Setores e exemplos

O provider atual exige exemplos para treinamento. A documentação fornecida não comprova que a entidade `Sector` real possui `examples`, `categories` ou `classification_examples`. Não foi criada migration nem campo novo.

## Proteções adicionadas

- metadata dos modelos inclui `dataSource: MOCK | REAL`;
- `AI_MODE` aceita `disabled`, `mock` ou `trained`;
- o modo padrão é `disabled`;
- modelo MOCK não é aceito no modo `trained`;
- setor novo continua gerando incompatibilidade explícita, exigindo novo treinamento.

## Pendências necessárias

Fornecer o repositório/contrato real do backend, confirmar formato de `GET /sectors` e definir onde exemplos oficiais serão armazenados. Só depois disso deve ser criado o `BackendSectorProvider` e qualquer alteração de banco/API.
