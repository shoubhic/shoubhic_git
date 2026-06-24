# Multi-Agent Routing and Intent Definition System (AGENTS.md)

This specification governs the Supervisor/Router Agent's intent classification, path decision matrices, and specialized sub-agent delegations.

---

## 1. Core Supervisor / Router Agent
The **Supervisor / Router Agent** is the single entry point for all incoming user inquiries. It does not perform tasks directly. Instead, it parses the query, matches it against intent classifiers, and structures a sequential execution pipeline of specialized sub-agents.

### Intent Classification Rules

| User Query Keywords / Pattern | Identified Intent Class | Primary Sub-Agent Path | Key System Tool |
| :--- | :--- | :--- | :--- |
| `ORD-`, `order`, `delivery`, `shipped`, `tracking`, `FedEx`, `UPS` | **TRANSACTION_CHECK** | Transactional Database Agent | `query_order_database` |
| `calculate`, `interest`, `rate`, `compound`, `math`, `multipliers`, `precision` | **RECONCILIATION_MATH** | Precision Calculator Agent | `calculator` & `web_search` |
| *All other general questions / explanations / knowledge retrievals* | **GENERAL_RETRIEVAL** | RAG Retriever Agent | `knowledge_retriever` |

---

## 2. Specialized Sub-Agent Catalog

### 1. Customer Service Router
* **Role**: Primary Orchestrator for transactional operations.
* **Responsibilities**:
  - Classifies conversational state.
  - Generates query filters for relational database keys.
  - Matches business policy requirements against custom knowledge documents.

### 2. Transactional Database Agent
* **Role**: Core Database Executor.
* **Responsibilities**:
  - Interfaces securely with order logs, customer history databases, and carrier status logs.
  - Retrieves order status, carrier delays, item descriptions, and trackIds.
  - Returns raw transaction payloads back to the Supervisor.

### 3. Precision Calculator Agent
* **Role**: Mathematical and Financial Executor.
* **Responsibilities**:
  - Performs floating-point arithmetic and compound interest calculations.
  - Prevents LLM hallucination of mathematical figures.
  - Takes raw market metrics and computes precise percentages.

### 4. Knowledge RAG Retriever
* **Role**: Semantic Searcher.
* **Responsibilities**:
  - Searches customer resource policy documents and guidelines.
  - Extracts specific clauses (e.g. Refund Policies, Priority Shipping, Compensation Tiers) to ground agent responses in verified guidelines.

### 5. Web Harvester Agent
* **Role**: Real-time Data Retriever.
* **Responsibilities**:
  - Polls live external search indexes.
  - Collects current interest rates, competitor pricing, and market statistics.

### 6. Sourcing Specialist
* **Role**: Supply Chain & Market Analyst.
* **Responsibilities**:
  - Capable of querying inventory databases, pulling competitor pricing arrays, and extracting financial metrics.

### 7. Synthesis Agent
* **Role**: Aggregating & Reporting Agent.
* **Responsibilities**:
  - Capable of aggregating multi-source inputs, running guardrail compliance checks, and drafting client-facing summaries.

---

## 3. Sequential Decision Execution Chains

### Scenario A: Customer Delivery Lookups (TRANSACTION_CHECK)
1. **Customer Service Router** matches intent.
2. **Transactional Database Agent** queries the order lookup tool for status logs.
3. **Knowledge RAG Retriever** extracts verified corporate policy details on delays.
4. **Response Coordinator (Orchestrator)** synthesizes a customized refund/discount proposal grounded in policy.

### Scenario B: Research & Calculation (RECONCILIATION_MATH)
1. **Research Planner Agent** establishes research parameters.
2. **Web Harvester Agent** retrieves market indexes from public query.
3. **Precision Calculator Agent** computes compounding percentages using verified tools.
4. **Synthesis Orchestrator** formats an executive report containing findings.

### Scenario C: Semantic Inquiries (GENERAL_RETRIEVAL)
1. **Conversational Planner** structures semantic query parameters.
2. **RAG Retriever Agent** pulls match metrics from vector indices.
3. **Synthesis Orchestrator** forms a conversational explanation.
