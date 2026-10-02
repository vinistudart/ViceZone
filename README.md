# Vice Zone — Mini Loja Distribuída

O visual da Vice Zone permanece no estilo neon/retrô original. A alteração principal está na arquitetura: o catálogo e os pedidos agora passam por Nginx, Flask e PostgreSQL em containers separados.

## Arquitetura

```text
USUÁRIO
   |
   v
FRONTEND / NGINX       Container 1
   |
   | HTTP / JSON
   v
API / FLASK            Container 2
   |
   | SQL
   v
POSTGRESQL             Container 3

Todos na rede Docker vice-zone-network.
```

## Estrutura

```text
sistema-loja-trabalho sistema distribuido/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── css/style.css
│   └── js/script.js
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py
└── database/
    └── init.sql
```

## Executar no PowerShell

Na pasta principal:

```powershell
docker compose config
docker compose up --build -d
docker compose ps
```

Abra **somente por Docker**:

```text
http://localhost:8080
```

Não use o Live Server do VS Code para esta versão. O site usa `/api/...`; no Live Server essa rota pode devolver o próprio `index.html`, causando o erro `Unexpected token '<'`.

## Testar a comunicação completa

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

Esperado: `api = OK` e `banco = OK`.

Produtos vindos do PostgreSQL:

```powershell
Invoke-RestMethod http://localhost:8080/api/produtos
```

## Ver dados direto no PostgreSQL

```powershell
docker compose exec database psql -U vicezone -d vicezone -c "SELECT id, nome, categoria, preco, estoque FROM produtos ORDER BY ordem;"
```

Pedidos:

```powershell
docker compose exec database psql -U vicezone -d vicezone -c "SELECT id, cliente, total, criado_em FROM pedidos ORDER BY id DESC;"
```

## Falha parcial para a apresentação

Pare só o banco:

```powershell
docker compose stop database
```

O Nginx ainda entrega o HTML/CSS/JS da loja, porém o catálogo deixa de ser carregado porque a API perdeu sua dependência PostgreSQL.

Depois recupere:

```powershell
docker compose start database
```

## Se você já executou uma versão anterior

A API possui uma migração simples no início e adiciona automaticamente os campos necessários ao banco antigo. Em geral não é necessário apagar o volume.

Se quiser zerar completamente os dados para uma demonstração limpa:

```powershell
docker compose down -v
docker compose up --build -d
```

## Logs

```powershell
docker compose logs -f frontend
docker compose logs -f api
docker compose logs -f database
```


## Imagens reais dos produtos

As imagens escolhidas para o catálogo estão em:

```text
frontend/assets/produtos/
```

Os nomes dos produtos continuam vindo da API Flask/PostgreSQL. O `frontend/js/script.js`
associa cada produto ao arquivo correspondente e o Nginx entrega essas imagens como conteúdo estático.

Depois de alterar ou trocar imagens do frontend, reconstrua o container do Nginx:

```powershell
docker compose up --build -d frontend
```

Se o navegador mantiver arquivos antigos em cache, use `Ctrl + F5`.

Não é necessário usar `docker compose down -v` para atualizar imagens; `-v` apagaria o volume do PostgreSQL.
