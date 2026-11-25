# FinSight AI

**AI-powered investor intelligence for company financial reports**

Upload a PDF, compare six financial metrics by company and fiscal year, and ask questions that draw on the indexed reports. Open any report in the dashboard to review its extracted growth drivers and risk factors.

**Python 3.12 · FastAPI · Jinja2 · PostgreSQL · Azure OpenAI · Azure AI Search**

[What you can do](#what-you-can-do) · [How it works](#how-it-works) · [Run locally](#run-locally) · [API reference](#api-reference) · [Deployment](#deployment)

## What you can do

| Task | What you get |
| --- | --- |
| Upload a company report | PDF upload progress followed by report analysis |
| Compare company financials | Revenue, net income, operating income, operating cash flow, total assets, and total liabilities in one table |
| Review report insights | Growth drivers and risk factors for the selected company and fiscal year |
| Ask questions about the reports | Chat across all indexed reports or focus on one company and fiscal year |

Figures are displayed as extracted from the reports. Check the currency and units in the source before comparing companies.

## How it works

![FinSight AI system diagram showing the dashboard, FastAPI, Azure OpenAI, Azure AI Search, and PostgreSQL](screenshots/FinSight%20AI%20System%20Architecture%20Diagram-1.png)

1. **Ingest the PDF.** FastAPI accepts the upload. PyMuPDF4LLM converts it to Markdown, and the ingestion pipeline splits it into searchable chunks.
2. **Index the report.** Azure OpenAI generates embeddings. Azure AI Search stores the chunks with company, fiscal year, and source filename metadata.
3. **Extract the financials.** The extraction pipeline retrieves relevant chunks and saves the structured results in PostgreSQL. The Jinja2 dashboard reads the latest saved record for each company and fiscal year.
4. **Answer questions.** Report chat retrieves relevant sections from Azure AI Search and sends them to Azure OpenAI as context for the answer.

<details>
<summary>View the logical architecture</summary>

![Logical architecture showing report upload, embeddings, retrieval, metric extraction, and dashboard storage](screenshots/FinSight%20AI%20Architecture%20Diagram.png)

</details>

## Run locally

You’ll need Python 3.12, `uv`, PostgreSQL, an Azure OpenAI resource with chat and embedding deployments, and an Azure AI Search service. Docker Compose is available for running PostgreSQL locally.

### 1. Install the Python dependencies

Run these commands from the project root.

```sh
uv venv --python 3.12
uv pip install -r requirements.txt
```

### 2. Configure the environment

Copy [`.env.example`](.env.example) to `.env` and fill in the following settings. Keep the completed `.env` file local.

| Service | Settings |
| --- | --- |
| Azure OpenAI | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` |
| Azure AI Search | `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_INDEX_NAME` |
| PostgreSQL | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |

Use your Azure OpenAI **deployment names**. The default Azure AI Search index schema expects embeddings with **1,536 dimensions**. Use an Azure AI Search key that can create the index and write documents.

### 3. Start PostgreSQL and the app

For the bundled PostgreSQL service, set `POSTGRES_HOST=127.0.0.1` and `POSTGRES_PORT=5432` in `.env`, then start it with Compose. If you already have a PostgreSQL server, use its connection settings and skip the Compose command.

```sh
docker compose up -d postgres
```

Once PostgreSQL is ready, start FastAPI from the project root.

```sh
uv run uvicorn app:app --host 127.0.0.1 --port 8000
```

Open the [dashboard](http://127.0.0.1:8000/). Upload a report named like `2024_Apple.pdf` so ingestion can identify the company and fiscal year from its filename. Then select its row to review the report insights or choose it as the context for a chat question.

## API reference

Use [Swagger UI](http://127.0.0.1:8000/docs) to inspect and try the endpoints while the app is running.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Open the dashboard |
| POST | `/api/upload` | Upload a PDF as multipart form data in the `file` field |
| GET | `/api/metrics` | List saved metrics by company and fiscal year |
| POST | `/api/chat` | Send a JSON `question` with optional `company` and `year` fields. Supply both to scope retrieval to one report |
| GET | `/health` | Check whether the API is responding |

## Repository layout

| Path | What’s inside |
| --- | --- |
| [`app.py`](app.py), [`routes/`](routes/) | FastAPI entry point, dashboard, upload, and chat routes |
| [`templates/`](templates/), [`static/`](static/) | Jinja2 dashboard, stylesheet, and browser interactions |
| [`ingestion/`](ingestion/), [`rag/`](rag/), [`vectorstore/`](vectorstore/) | PDF processing, metric extraction, Azure AI Search indexing, and retrieval |
| [`database/`](database/) | PostgreSQL schema, storage, and metric queries |
| [`k8s/`](k8s/), [`.github/workflows/`](.github/workflows/) | Kubernetes manifests and GitHub Actions deployment workflow |
| [`screenshots/`](screenshots/) | System, logical, and deployment diagrams |

## Deployment

The repository includes a Docker image definition, Kubernetes manifests, and a GitHub Actions workflow that builds the image, pushes it to Azure Container Registry, and deploys it to Azure Kubernetes Service.

| Guide | Use it for |
| --- | --- |
| [AKS deployment guide](deployment-Document.md) | Manual container build and AKS deployment |
| [CI/CD reference](CICD_Deployment_Guide.md) | GitHub Actions and Kubernetes configuration |
| [Project journey](project_journey.md) | Original plan and development phases |

<details>
<summary>View the Azure AKS deployment diagram</summary>

![Azure AKS deployment design showing the application, networking, database, and managed AI services](screenshots/FinSight%20AI%20Azure%20Architecture%20Diagram.png)

</details>

<details>
<summary>View the proposed Azure VM deployment</summary>

![Proposed Azure Linux VM deployment with Nginx, Docker Compose, PostgreSQL, and Azure AI services](screenshots/FinSight%20AI%20Azure%20Deployment%20Architecture-2.png)

</details>
