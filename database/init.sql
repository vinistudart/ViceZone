CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    preco_antigo NUMERIC(10,2),
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    icone VARCHAR(20) NOT NULL DEFAULT '🎮',
    badge VARCHAR(50) NOT NULL DEFAULT 'VICE ZONE',
    cor VARCHAR(30) NOT NULL DEFAULT '#12152b',
    ordem INTEGER NOT NULL DEFAULT 999
);

CREATE UNIQUE INDEX IF NOT EXISTS produtos_nome_unique ON produtos(nome);

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(150) NOT NULL,
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0)
);

INSERT INTO produtos
    (nome, categoria, descricao, preco, preco_antigo, estoque, icone, badge, cor, ordem)
VALUES
    ('PlayStation 5 Slim', 'Consoles', 'Console de nova geração com SSD ultrarrápido.', 3999.90, 4299.90, 10, '🎮', 'DESTAQUE', '#10152d', 1),
    ('EA Sports FC 26', 'Jogos', 'Futebol de nova geração para quem vive o competitivo.', 299.90, 349.90, 20, '⚽', 'NOVO', '#063536', 2),
    ('GeForce RTX 5070', 'PC', 'Placa de vídeo para jogos e criação em alto desempenho.', 4199.90, NULL, 6, '🖥️', 'HARDWARE', '#063142', 3),
    ('Nintendo Switch OLED', 'Consoles', 'Console híbrido com tela OLED.', 2199.90, 2399.90, 12, '🎮', 'OFERTA', '#451021', 4),
    ('The Legend of Zelda', 'Jogos', 'Aventura clássica para Nintendo Switch.', 299.90, NULL, 8, '🗡️', 'NINTENDO', '#132810', 5),
    ('PlayStation 2 Slim', 'Retrô', 'Clássico PS2 Slim para colecionadores.', 599.90, 699.90, 5, '🕹️', 'RETRÔ', '#181724', 6),
    ('Super Nintendo', 'Retrô', 'Console 16-bit que marcou gerações.', 799.90, NULL, 3, '👾', 'CLÁSSICO', '#392934', 7),
    ('Memória RAM 32GB DDR4', 'PC', 'Kit de memória para jogos e multitarefa.', 549.90, 649.90, 15, '💾', 'PC GAMING', '#111634', 8),
    ('Xbox Series X', 'Consoles', 'Console de alto desempenho para jogos em até 4K.', 4299.90, NULL, 7, '🎮', 'XBOX', '#062514', 9),
    ('GTA Vice City', 'Retrô', 'Um clássico com toda a atmosfera neon dos anos 80.', 149.90, 199.90, 10, '🌴', 'CLÁSSICO', '#5c0c33', 10),
    ('SSD NVMe 1TB', 'PC', 'Armazenamento NVMe de alta velocidade.', 449.90, 499.90, 18, '💿', 'OFERTA', '#102b48', 11),
    ('Nintendo 64', 'Retrô', 'Console retrô com foco nos clássicos 3D.', 899.90, NULL, 4, '🕹️', 'RARIDADE', '#282034', 12)
ON CONFLICT (nome) DO UPDATE SET
    categoria = EXCLUDED.categoria,
    descricao = EXCLUDED.descricao,
    preco = EXCLUDED.preco,
    preco_antigo = EXCLUDED.preco_antigo,
    icone = EXCLUDED.icone,
    badge = EXCLUDED.badge,
    cor = EXCLUDED.cor,
    ordem = EXCLUDED.ordem;
