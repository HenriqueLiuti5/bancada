-- Papéis do banco em produção (ADR 0032). Roda uma vez, quando o banco é criado, pelo
-- criar-papeis.sh. Num banco gerenciado, rode este arquivo com o psql, informando as variáveis:
--
--   psql -v banco=bancada -v dono=bancada_dono -v senha_do_dono=... \
--        -v aplicacao=bancada_app -v senha_da_aplicacao=... -f papeis.sql
--
-- O dono é dono das tabelas e roda as migrações. A aplicação (API, worker e agendador) só lê e
-- grava: não cria nem altera tabelas, não desliga o isolamento entre assistências (RLS) e não
-- cria bancos. Nenhum dos dois é superusuário, porque superusuário ignora o RLS (ADR 0009).

\set ON_ERROR_STOP on

CREATE ROLE :"dono" LOGIN PASSWORD :'senha_do_dono';
CREATE ROLE :"aplicacao" LOGIN PASSWORD :'senha_da_aplicacao';

REVOKE ALL ON DATABASE :"banco" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"banco" TO :"dono", :"aplicacao";

ALTER SCHEMA public OWNER TO :"dono";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"aplicacao";

-- Tudo o que o dono criar nas migrações nasce com leitura e escrita para a aplicação.
ALTER DEFAULT PRIVILEGES FOR ROLE :"dono" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"aplicacao";
ALTER DEFAULT PRIVILEGES FOR ROLE :"dono" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"aplicacao";
