# Vice Zone

## Mini Loja Distribuída de Games, Consoles e Hardware

A **Vice Zone** é uma aplicação web desenvolvida para demonstrar, na prática, como diferentes serviços podem trabalhar de forma integrada dentro de uma arquitetura distribuída.

Com uma identidade visual inspirada na estética **retrô/neon dos anos 80**, a plataforma simula uma loja especializada em videogames, consoles, hardware e produtos clássicos do universo gamer.

Por trás da interface, a aplicação utiliza uma arquitetura formada por três serviços independentes:

- Frontend com **Nginx**
- API com **Flask**
- Banco de dados **PostgreSQL**

Todos os componentes são executados em containers Docker separados e se comunicam por meio de uma rede interna.

---

## Arquitetura

Para o usuário, a Vice Zone funciona como uma única aplicação.

Internamente, cada componente possui uma responsabilidade específica:

```text
USUÁRIO
   |
   v
FRONTEND / NGINX
Container 1
   |
   | HTTP / JSON
   v
API / FLASK
Container 2
   |
   | SQL
   v
POSTGRESQL
Container 3
Todos os serviços estão conectados pela rede Docker:
vice-zone-network

Principais Funcionalidades
- Catálogo de produtos
- Consoles atuais e retrô
- Jogos
- Hardware para PC
- Imagens reais dos produtos
- Categorias
- Preços
- Controle de estoque
- Carrinho de compras
- Registro de pedidos
- Integração entre frontend, API e banco de dados
- Persistência das informações no PostgreSQL
Tecnologias Utilizadas
Frontend
- HTML5
- CSS3
- JavaScript
- Nginx
Backend
- Python
- Flask
- API REST
- JSON
Banco de Dados
- PostgreSQL
Infraestrutura
- Docker
- Docker Compose
- Docker Network
Estrutura do Projeto
sistema-loja-trabalho sistema distribuido/
│
├── docker-compose.yml
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── assets/
│       └── produtos/
│
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py
│
└── database/
    └── init.sql

Como Executar
Pré-requisitos
É necessário possuir:
- Docker
- Docker Compose
Com o Docker em execução, abra o PowerShell dentro da pasta principal do projeto.
1. Validar o Docker Compose
docker compose config

2. Construir e iniciar os serviços
docker compose up --build -d

3. Verificar os containers
docker compose ps

O ambiente deverá apresentar os serviços:
frontend
api
database

4. Acessar a aplicação
Abra no navegador:
http://localhost:8080

A Vice Zone deve ser acessada através do ambiente Docker.

Não utilize o Live Server do VS Code nesta versão, pois o frontend utiliza rotas /api/... encaminhadas pelo Nginx para a API Flask.
Fluxo de Comunicação
Quando o frontend precisa carregar os produtos, o fluxo acontece da seguinte forma:
Navegador
   |
   | GET /api/produtos
   v
Nginx
   |
   | HTTP
   v
Flask
   |
   | SQL
   v
PostgreSQL
   |
   v
JSON
   |
   v
Frontend

O navegador não acessa diretamente o banco de dados.
A API Flask funciona como intermediária entre a interface e o PostgreSQL.
Testando a API
Health Check
Invoke-RestMethod http://localhost:8080/api/health

Resultado esperado:
API: OK
Banco: OK

Consultar Produtos
Invoke-RestMethod http://localhost:8080/api/produtos

Os dados retornados pela API são utilizados pelo frontend para montar dinamicamente o catálogo.
Consultando o PostgreSQL
Produtos Cadastrados
docker compose exec database psql -U vicezone -d vicezone -c "SELECT id, nome, categoria, preco, estoque FROM produtos ORDER BY ordem;"

Pedidos Realizados
docker compose exec database psql -U vicezone -d vicezone -c "SELECT id, cliente, total, criado_em FROM pedidos ORDER BY id DESC;"

Isso permite verificar diretamente no banco os pedidos registrados pela aplicação.
Demonstração de Falha Parcial
Um dos objetivos do projeto é demonstrar como falhas independentes podem acontecer em uma arquitetura formada por múltiplos serviços.
Por exemplo, é possível interromper apenas o banco de dados:
docker compose stop database

Nesse cenário:
FRONTEND      FUNCIONANDO
API           FUNCIONANDO
POSTGRESQL    PARADO

O Nginx continua entregando HTML, CSS, JavaScript e imagens.
Entretanto, funcionalidades que dependem dos dados armazenados no PostgreSQL deixam de funcionar corretamente.
Isso demonstra uma característica importante de Sistemas Distribuídos:
Uma falha em um componente não necessariamente interrompe todos os outros serviços.

Para recuperar o banco:
docker compose start database

Persistência de Dados
O PostgreSQL utiliza armazenamento persistente.
Por isso, reiniciar os containers normalmente não apaga produtos ou pedidos.
Para parar os serviços:
docker compose stop

Para iniciá-los novamente:
docker compose start

Reinicialização Completa
Caso seja necessário apagar completamente os dados e recriar o ambiente:
docker compose down -v
docker compose up --build -d

Atenção: o parâmetro -v remove o volume do PostgreSQL e apaga os dados armazenados.

Utilize apenas quando realmente desejar reinicializar o banco.
Logs
Frontend
docker compose logs -f frontend

API
docker compose logs -f api

Banco de Dados
docker compose logs -f database

Os logs ajudam a acompanhar requisições, erros e o comportamento individual de cada serviço.
Catálogo e Imagens
As imagens dos produtos estão armazenadas em:
frontend/assets/produtos/

Os dados como:
- Nome
- Categoria
- Preço
- Estoque
são fornecidos pelo PostgreSQL através da API Flask.
Já as imagens são arquivos estáticos entregues pelo Nginx.
O arquivo:
frontend/js/script.js

associa cada produto retornado pela API à sua respectiva imagem.
Atualizando Imagens do Frontend
Depois de alterar uma imagem ou outro arquivo estático, reconstrua o frontend:
docker compose up --build -d frontend

Caso o navegador continue mostrando uma versão antiga:
Ctrl + F5

Não é necessário utilizar:
docker compose down -v

para atualizar imagens.
Conceitos Demonstrados
O projeto Vice Zone demonstra de forma prática:
- Container x Imagem
- Docker Compose
- Docker Network
- Comunicação entre containers
- Portas
- API REST
- Comunicação HTTP
- JSON
- Persistência de dados
- Separação de responsabilidades
- Falhas parciais
- Dependência entre serviços
- Disponibilidade
- Recuperação de serviços
Arquitetura Resumida
                  VICE ZONE

                    USUÁRIO
                       |
                       v
              FRONTEND / NGINX
                 Container 1
                       |
                     HTTP
                       |
                       v
                API / FLASK
                 Container 2
                       |
                      SQL
                       |
                       v
                 POSTGRESQL
                 Container 3

              Docker Network
             vice-zone-network

Objetivo Acadêmico
Projeto desenvolvido para a disciplina de Sistemas Distribuídos, com o objetivo de demonstrar como múltiplos serviços independentes podem se comunicar e funcionar, para o usuário, como uma única aplicação.
A arquitetura utiliza frontend, API e banco de dados em containers separados, permitindo demonstrar comunicação, dependências, falhas parciais e disponibilidade.
Autor
Vinicius Studart
