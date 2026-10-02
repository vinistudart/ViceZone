import os
import socket
import time
from decimal import Decimal

import psycopg2
from flask import Flask, jsonify, request
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "database"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "vicezone"),
    "user": os.getenv("DB_USER", "vicezone"),
    "password": os.getenv("DB_PASSWORD", "vicezone"),
    "connect_timeout": 3,
}

SEED_PRODUCTS = [
    ("PlayStation 5 Slim", "Consoles", "Console de nova geração com SSD ultrarrápido.", Decimal("3999.90"), Decimal("4299.90"), 10, "🎮", "DESTAQUE", "#10152d", 1),
    ("EA Sports FC 26", "Jogos", "Futebol de nova geração para quem vive o competitivo.", Decimal("299.90"), Decimal("349.90"), 20, "⚽", "NOVO", "#063536", 2),
    ("GeForce RTX 5070", "PC", "Placa de vídeo para jogos e criação em alto desempenho.", Decimal("4199.90"), None, 6, "🖥️", "HARDWARE", "#063142", 3),
    ("Nintendo Switch OLED", "Consoles", "Console híbrido com tela OLED.", Decimal("2199.90"), Decimal("2399.90"), 12, "🎮", "OFERTA", "#451021", 4),
    ("The Legend of Zelda", "Jogos", "Aventura clássica para Nintendo Switch.", Decimal("299.90"), None, 8, "🗡️", "NINTENDO", "#132810", 5),
    ("PlayStation 2 Slim", "Retrô", "Clássico PS2 Slim para colecionadores.", Decimal("599.90"), Decimal("699.90"), 5, "🕹️", "RETRÔ", "#181724", 6),
    ("Super Nintendo", "Retrô", "Console 16-bit que marcou gerações.", Decimal("799.90"), None, 3, "👾", "CLÁSSICO", "#392934", 7),
    ("Memória RAM 32GB DDR4", "PC", "Kit de memória para jogos e multitarefa.", Decimal("549.90"), Decimal("649.90"), 15, "💾", "PC GAMING", "#111634", 8),
    ("Xbox Series X", "Consoles", "Console de alto desempenho para jogos em até 4K.", Decimal("4299.90"), None, 7, "🎮", "XBOX", "#062514", 9),
    ("GTA Vice City", "Retrô", "Um clássico com toda a atmosfera neon dos anos 80.", Decimal("149.90"), Decimal("199.90"), 10, "🌴", "CLÁSSICO", "#5c0c33", 10),
    ("SSD NVMe 1TB", "PC", "Armazenamento NVMe de alta velocidade.", Decimal("449.90"), Decimal("499.90"), 18, "💿", "OFERTA", "#102b48", 11),
    ("Nintendo 64", "Retrô", "Console retrô com foco nos clássicos 3D.", Decimal("899.90"), None, 4, "🕹️", "RARIDADE", "#282034", 12),
]


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def serialize_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def serialize(row):
    return {key: serialize_value(value) for key, value in row.items()}


def ensure_schema_and_seed(max_attempts=20):
    """Mantém o projeto compatível mesmo se o usuário já tiver um volume antigo."""
    last_error = None

    for _ in range(max_attempts):
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS produtos (
                            id SERIAL PRIMARY KEY,
                            nome VARCHAR(150) NOT NULL,
                            categoria VARCHAR(50) NOT NULL,
                            descricao TEXT NOT NULL DEFAULT '',
                            preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
                            estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
                            icone VARCHAR(20) NOT NULL DEFAULT '🎮'
                        );

                        ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_antigo NUMERIC(10,2);
                        ALTER TABLE produtos ADD COLUMN IF NOT EXISTS badge VARCHAR(50) NOT NULL DEFAULT 'VICE ZONE';
                        ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cor VARCHAR(30) NOT NULL DEFAULT '#12152b';
                        ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 999;

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

                        CREATE UNIQUE INDEX IF NOT EXISTS produtos_nome_unique ON produtos(nome);
                    """)

                    seed_sql = """
                        INSERT INTO produtos
                            (nome, categoria, descricao, preco, preco_antigo, estoque, icone, badge, cor, ordem)
                        VALUES
                            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (nome) DO UPDATE SET
                            categoria = EXCLUDED.categoria,
                            descricao = EXCLUDED.descricao,
                            preco = EXCLUDED.preco,
                            preco_antigo = EXCLUDED.preco_antigo,
                            icone = EXCLUDED.icone,
                            badge = EXCLUDED.badge,
                            cor = EXCLUDED.cor,
                            ordem = EXCLUDED.ordem;
                    """

                    for product in SEED_PRODUCTS:
                        cur.execute(seed_sql, product)

                    # A versão anterior do projeto tinha Cyberpunk no lugar de GTA Vice City.
                    # Remove apenas se ele ainda não tiver sido usado em pedido.
                    cur.execute("""
                        DELETE FROM produtos p
                        WHERE p.nome = 'Cyberpunk 2077'
                          AND NOT EXISTS (
                            SELECT 1 FROM itens_pedido i WHERE i.produto_id = p.id
                          );
                    """)
                conn.commit()
            return
        except Exception as exc:
            last_error = exc
            time.sleep(1)

    raise RuntimeError(f"Não foi possível preparar o banco: {last_error}")


@app.get("/")
def index():
    return jsonify({
        "sistema": "Vice Zone - Mini Loja Distribuída",
        "servico": "API Flask",
        "status": "OK",
        "container": socket.gethostname(),
        "fluxo": "Nginx -> Flask -> PostgreSQL",
    })


@app.get("/health")
def health():
    result = {
        "api": "OK",
        "banco": "INDISPONIVEL",
        "api_container": socket.gethostname(),
        "db_host": DB_CONFIG["host"],
    }

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database(), inet_server_addr()::text;")
                database_name, database_ip = cur.fetchone()
        result.update({
            "banco": "OK",
            "database": database_name,
            "database_ip": database_ip,
        })
        return jsonify(result), 200
    except Exception as exc:
        result["detalhes"] = str(exc)
        return jsonify(result), 503


@app.get("/produtos")
def list_products():
    category = request.args.get("categoria")
    query = request.args.get("q")

    sql = """
        SELECT
            id,
            nome,
            categoria,
            descricao,
            preco,
            preco_antigo,
            estoque,
            icone,
            icone AS emoji,
            badge,
            cor,
            ordem
        FROM produtos
    """
    where = []
    params = []

    if category and category.lower() != "todos":
        where.append("LOWER(categoria) = LOWER(%s)")
        params.append(category)

    if query:
        term = f"%{query}%"
        where.append("(nome ILIKE %s OR categoria ILIKE %s OR badge ILIKE %s)")
        params.extend([term, term, term])

    if where:
        sql += " WHERE " + " AND ".join(where)

    sql += " ORDER BY ordem, id;"

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = [serialize(row) for row in cur.fetchall()]
        return jsonify(rows)
    except Exception as exc:
        return jsonify({"erro": "Banco de dados indisponível", "detalhes": str(exc)}), 503


@app.get("/produtos/<int:product_id>")
def get_product(product_id):
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, nome, categoria, descricao, preco, preco_antigo,
                           estoque, icone, icone AS emoji, badge, cor, ordem
                    FROM produtos
                    WHERE id = %s;
                """, (product_id,))
                row = cur.fetchone()

        if row is None:
            return jsonify({"erro": "Produto não encontrado"}), 404
        return jsonify(serialize(row))
    except Exception as exc:
        return jsonify({"erro": "Banco de dados indisponível", "detalhes": str(exc)}), 503


@app.get("/pedidos")
def list_orders():
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, cliente, total, criado_em FROM pedidos ORDER BY id DESC;")
                rows = [serialize(row) for row in cur.fetchall()]
        return jsonify(rows)
    except Exception as exc:
        return jsonify({"erro": "Banco de dados indisponível", "detalhes": str(exc)}), 503


@app.post("/pedidos")
def create_order():
    data = request.get_json(silent=True) or {}
    customer = str(data.get("cliente", "")).strip()
    items = data.get("itens", [])

    if not customer:
        return jsonify({"erro": "Informe o nome do cliente"}), 400
    if not isinstance(items, list) or not items:
        return jsonify({"erro": "O carrinho está vazio"}), 400

    conn = None
    try:
        conn = get_connection()
        conn.autocommit = False
        total = Decimal("0.00")
        order_items = []

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for item in items:
                product_id = int(item.get("produto_id"))
                quantity = int(item.get("quantidade", 1))
                if quantity <= 0:
                    raise ValueError("Quantidade inválida")

                cur.execute("""
                    SELECT id, nome, preco, estoque
                    FROM produtos
                    WHERE id = %s
                    FOR UPDATE;
                """, (product_id,))
                product = cur.fetchone()

                if product is None:
                    raise ValueError(f"Produto {product_id} não encontrado")
                if product["estoque"] < quantity:
                    raise ValueError(
                        f"Estoque insuficiente para {product['nome']}. Disponível: {product['estoque']}"
                    )

                total += product["preco"] * quantity
                order_items.append({
                    "produto_id": product["id"],
                    "nome": product["nome"],
                    "quantidade": quantity,
                    "preco_unitario": product["preco"],
                })

            cur.execute("""
                INSERT INTO pedidos (cliente, total)
                VALUES (%s, %s)
                RETURNING id, cliente, total, criado_em;
            """, (customer, total))
            order = cur.fetchone()

            for item in order_items:
                cur.execute("""
                    INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
                    VALUES (%s, %s, %s, %s);
                """, (
                    order["id"],
                    item["produto_id"],
                    item["quantidade"],
                    item["preco_unitario"],
                ))
                cur.execute("""
                    UPDATE produtos
                    SET estoque = estoque - %s
                    WHERE id = %s;
                """, (item["quantidade"], item["produto_id"]))

        conn.commit()
        response = serialize(order)
        response["status"] = "PEDIDO_REGISTRADO"
        response["itens"] = [
            {**item, "preco_unitario": float(item["preco_unitario"])}
            for item in order_items
        ]
        return jsonify(response), 201

    except ValueError as exc:
        if conn:
            conn.rollback()
        return jsonify({"erro": str(exc)}), 400
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"erro": "Não foi possível registrar o pedido", "detalhes": str(exc)}), 503
    finally:
        if conn:
            conn.close()


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"erro": "Rota não encontrada"}), 404


if __name__ == "__main__":
    ensure_schema_and_seed()
    app.run(host="0.0.0.0", port=5000, debug=False)
