# Avvio con Docker

Il file `compose.yaml` principale avvia l'intero sistema come un unico stack:

- portale SvelteKit (`web`);
- database PostgreSQL (`db`);
- servizio Python/FastAPI (`image-api`).

I servizi rimangono correttamente isolati in container distinti, ma vengono
costruiti, avviati e arrestati insieme. Comunicano sulla rete Docker privata
`thesis-portal-network`.

## Requisiti

- Docker Desktop, oppure Docker Engine con Docker Compose v2;
- porte locali `5173`, `5432` e `8000` disponibili;
- Ollama in ascolto sulla porta `11434`, salvo uso di `DEVELOPMENT_MODE=true`.

## 1. Configurare lo stack

Dalla cartella principale del progetto:

```bash
cp docker.env.example docker.env
```

Aprire `docker.env` e sostituire almeno:

- `POSTGRES_PASSWORD` con una password casuale;
- `BETTER_AUTH_SECRET` con un segreto lungo e casuale;
- `PYTHON_SERVER_HMAC_SECRET` con un terzo segreto casuale.

Si puo generare ciascun segreto con:

```bash
openssl rand -hex 32
```

`docker.env` e escluso da Git e non deve essere versionato.

Per provare il sistema senza un'istanza Ollama, impostare:

```dotenv
DEVELOPMENT_MODE=true
```

In modalità normale, `OLLAMA_CHAT_URL` punta a Ollama sulla macchina host tramite
`host.docker.internal`. Su Docker Desktop non serve altra configurazione.

## 2. Avviare l'intero sistema

```bash
docker compose --env-file docker.env up --build -d
```

Con questo singolo comando Docker costruisce e avvia tutti e tre i servizi.

- Portale: <http://localhost:5173>
- Health check Python: <http://127.0.0.1:8000/health/live>
- PostgreSQL: `127.0.0.1:5432`

All'interno della rete Docker, il portale usa `db:5432` per PostgreSQL e
`image-api:8000` per FastAPI.

Controllare lo stato:

```bash
docker compose --env-file docker.env ps
docker compose --env-file docker.env logs -f web db image-api
```

Al primo avvio di un volume vuoto, PostgreSQL esegue automaticamente l'unico
script completo: `sveltekit_website/drizzle/0000_initial_schema.sql`.

Lo script di inizializzazione non viene rieseguito sui volumi gia esistenti.

Verificare il servizio Python:

```bash
curl http://127.0.0.1:8000/health/live
docker compose --env-file docker.env logs -f image-api
```

## Creare gli utenti iniziali

Compilare in `docker.env` `INITIAL_USERS_PASSWORD` e gli indirizzi email degli
utenti desiderati, ricreare `web`, quindi eseguire:

```bash
docker compose --env-file docker.env exec web node scripts/seed-initial-users.mjs
```

## Database Docker gia esistente

Lo schema unico e destinato a database vuoti. Se esiste gia un volume PostgreSQL,
non eseguire nuovamente il baseline sopra i dati: effettuare prima un backup e
pianificare l'aggiornamento dello schema oppure ricreare il volume se i dati non
devono essere conservati.

## Arrestare i servizi

Arrestare l'intero stack:

```bash
docker compose --env-file docker.env down
```

Il volume PostgreSQL viene conservato. Il comando seguente elimina anche tutti i
dati del database Docker e va usato soltanto se si vuole ripartire da zero:

```bash
docker compose --env-file docker.env down -v
```

## Uso in produzione

Prima di pubblicare il sistema:

- usare segreti unici e non versionati;
- impostare `PUBLIC_URL`, `BETTER_AUTH_URL` e `BETTER_AUTH_CLIENT_URL` sull'URL HTTPS reale;
- mettere il portale dietro un reverse proxy HTTPS;
- non esporre PostgreSQL e FastAPI oltre `127.0.0.1` senza firewall e autenticazione;
- predisporre backup periodici del volume `postgres_data`.
