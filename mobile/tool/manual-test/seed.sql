-- Dados para o teste manual do app (API local + mobile, sem o portal web).
--
--   docker cp tool/manual-test/seed.sql Sinaliza_postgres:/tmp/seed.sql
--   docker exec Sinaliza_postgres psql -U postgres -d sinaliza -f /tmp/seed.sql
--
-- Idempotente: pode rodar de novo.
--
-- 1) Setores com os UUIDs que o classificador local (ai/, modo demo) devolve
--    (ai/config/backend-demo-sector-map.json).
-- 2) Usuários de teste com a MESMA senha do admin (ADMIN_PASSWORD do api/.env):
--    - aluno@sinaliza.local  (matrícula 2023001234, vínculo ALUNO, SOLICITANTE)
--    - setor@sinaliza.local  (equipe do setor Infraestrutura, SEM tickets:create)

INSERT INTO sectors (uuid, name, categories) VALUES
  ('10000000-0000-4000-8000-000000000001', 'TI', ''),
  ('10000000-0000-4000-8000-000000000002', 'Secretaria Acadêmica', ''),
  ('10000000-0000-4000-8000-000000000003', 'Financeiro', ''),
  ('10000000-0000-4000-8000-000000000004', 'Biblioteca', ''),
  ('10000000-0000-4000-8000-000000000005', 'Infraestrutura', '')
ON CONFLICT (uuid) DO NOTHING;

INSERT INTO users (uuid, email, password_hash, name, status, institutional_id, institutional_link)
SELECT gen_random_uuid(), 'aluno@sinaliza.local', admin.password_hash,
       'Maria Aluna', 'ACTIVE', '2023001234', 'ALUNO'
FROM users admin
WHERE admin.email = 'admin@sinaliza.local'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (uuid, email, password_hash, name, status, institutional_link)
SELECT gen_random_uuid(), 'setor@sinaliza.local', admin.password_hash,
       'João do Setor', 'ACTIVE', 'SERVIDOR'
FROM users admin
WHERE admin.email = 'admin@sinaliza.local'
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'aluno@sinaliza.local' AND r.name = 'REQUESTER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'setor@sinaliza.local' AND r.name = 'SECTOR'
ON CONFLICT DO NOTHING;

INSERT INTO sector_users (user_id, sector_id)
SELECT u.id, s.id FROM users u, sectors s
WHERE u.email = 'setor@sinaliza.local' AND s.name = 'Infraestrutura'
ON CONFLICT DO NOTHING;

-- Conferência
SELECT u.email, u.institutional_id, u.status, string_agg(r.name, ',') AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY u.email, u.institutional_id, u.status
ORDER BY u.email;
SELECT uuid, name FROM sectors ORDER BY name;
