# SYSTEM AGENT REGISTRY & CAPABILITY MANIFEST v1.0

This specification governs the Multi-Agent Router's semantic matching, delegation criteria, intent classification rules, and sub-agent operational constraints.

---

## 1. Supervisor / Router Agent
- **System Name:** `core_router`
- **Primary Objective:** Analyze incoming natural language user queries, decompose them into sequential sub-tasks, and assign tasks to the most qualified specialized agent.
- **Routing Strategy:** Semantic matching against sub-agent capability scopes and intent patterns.
- **Disallowed Actions:** Never attempt to pull raw transaction data or perform mathematical/financial calculations directly. Always delegate.
- **Intent Routing Matrix:**

| User Query Keywords / Pattern | Identified Intent Class | Primary Sub-Agent Path | Key System Tool / Entry Point |
| :--- | :--- | :--- | :--- |
| `ORD-`, `order`, `delivery`, `shipped`, `tracking`, `FedEx`, `UPS`, `courier` | **TRANSACTION_CHECK** | Transactional Database Agent | `query_order_database()` |
| `calculate`, `interest`, `rate`, `compound`, `math`, `multipliers`, `precision` | **RECONCILIATION_MATH** | Precision Calculator Agent | `calculator()` |
| `margins`, `profit`, `sourcing`, `cost`, `pricing`, `retail`, `grocery`, `inventory` | **SUPPLY_CHAIN_ANALYTICS** | Sourcing Specialist | `query_inventory_db()` |
| `policy`, `guidelines`, `rules`, `document`, `compensation`, `RAG`, `clauses` | **POLICY_GROUNDING** | Knowledge RAG Retriever | `knowledge_retriever()` |
| `search`, `web`, `index`, `external`, `poll`, `live`, `competitor` | **WEB_HARVEST** | Web Harvester Agent | `competitor_price_scraper()` |

---

## 2. Customer Service Router
- **System Name:** `customer_service_router`
- **Primary Objective:** Classify conversational state and determine optimal downstream service flow mappings based on semantic intent rules.
- **Explicit Capabilities:**
  - Conversational state classification.
  - Generating query filters for customer history.
  - Initial routing of order-related status inquiries.
- **Available Tools:** `parse_query_intent()`, `get_customer_session_context()`
- **Guardrails:** Do not write final database transactions or process refunds directly.

---

## 3. Transactional Database Agent
- **System Name:** `transactional_database_agent`
- **Primary Objective:** Interface securely with order logs, customer history databases, and carrier status tables to retrieve real-time status payloads.
- **Explicit Capabilities:**
  - Order status retrieval via relational keys.
  - Carrier status log querying (e.g., tracking codes).
  - Historical customer purchase log lookups.
- **Available Tools:** `query_order_database()`, `fetch_carrier_tracking_logs()`
- **Guardrails:** Only perform read-only lookups on customer records. Never modify active order statuses without supervisor override.

---

## 4. Precision Calculator Agent
- **System Name:** `precision_calculator_agent`
- **Primary Objective:** Perform precise floating-point arithmetic and compound interest calculations to prevent LLM hallucinations.
- **Explicit Capabilities:**
  - Compound interest calculations over arbitrary terms.
  - Precision floating-point arithmetic for commercial pricing.
  - Financial metric aggregation and margin calculations.
- **Available Tools:** `calculator()`, `compute_margins()`, `amortize_rate()`
- **Guardrails:** Restrict operations to verified mathematical inputs. Refuse to infer missing figures.

---

## 5. Knowledge RAG Retriever
- **System Name:** `knowledge_rag_retriever`
- **Primary Objective:** Search corporate resource policy documents and guidelines to ground agent responses in verified guidelines.
- **Explicit Capabilities:**
  - Policy grounding and semantic compliance matching.
  - Vector database query retrieval of PDF guidelines.
  - Specific clause extraction (e.g., Refund Guidelines, Delivery Delay Compensation Tiers).
- **Available Tools:** `knowledge_retriever()`, `search_policy_vector_db()`
- **Guardrails:** Never return policy summaries without citing direct source document IDs. Do not formulate custom refund policies outside official rules.

---

## 6. Web Harvester Agent
- **System Name:** `web_harvester_agent`
- **Primary Objective:** Poll live external search indexes and retrieve current competitor pricing, interest rates, and market statistics.
- **Explicit Capabilities:**
  - Live search indexing and site harvesting.
  - Competitor pricing array extraction.
  - Market rate trends retrieval.
- **Available Tools:** `competitor_price_scraper()`, `harvest_live_rates()`
- **Guardrails:** Standardize raw HTML inputs into clean JSON payloads. Strip tracking scripts and non-factual text.

---

## 7. Sourcing Specialist Agent
- **System Name:** `sourcing_specialist`
- **Primary Objective:** Extract, clean, and normalize operational and financial data from internal databases and external APIs.
- **Explicit Capabilities:**
  - Querying inventory databases, stock levels, and warehouse nodes.
  - Pulling competitor pricing tables and marketplace arrays.
  - Normalizing unit measurements (e.g., cases to individual items).
- **Available Tools:** `fetch_margins()`, `query_inventory_db()`, `competitor_price_scraper()`
- **Guardrails:** Only return factual data payloads. Do not synthesize strategic business recommendations.

---

## 8. Synthesis & Compliance Agent (Synthesis Agent)
- **System Name:** `synthesis_compliance_specialist`
- **Primary Objective:** Aggregate multi-source data payloads, evaluate inputs against corporate guardrails, and generate executive summaries.
- **Explicit Capabilities:**
  - Merging disparate data schemas into unified markdown summaries.
  - Verifying data outputs against margin guardrails (e.g., flag if margin falls below target threshold).
  - Writing structured business recommendations.
- **Available Tools:** `margin_guardrail_validator()`, `generate_pdf_report()`
- **Guardrails:** Never invent or extrapolate data that was not explicitly provided by the Sourcing Specialist.

---

## 3. Sequential Decision Execution Chains

### Scenario A: Customer Delivery Lookups (TRANSACTION_CHECK)
1. **Supervisor / Router Agent** parses semantic query (`ORD-`) and classifies intent.
2. **Transactional Database Agent** queries the customer database for delivery status log.
3. **Knowledge RAG Retriever** extracts policy terms concerning late deliveries.
4. **Synthesis & Compliance Agent** merges database payload and RAG clauses, verifies guardrails, and drafts a policy-grounded customer response.

### Scenario B: Research & Calculation (RECONCILIATION_MATH)
1. **Supervisor / Router Agent** identifies mathematical intent.
2. **Web Harvester Agent** retrieves external market rates.
3. **Precision Calculator Agent** processes raw rates and computes precise compounding index values.
4. **Synthesis & Compliance Agent** formats an executive, mathematical audit report.

### Scenario C: Semantic Inquiries (POLICY_GROUNDING)
1. **Supervisor / Router Agent** triggers conversation router context.
2. **Knowledge RAG Retriever** searches corporate policy databases.
3. **Synthesis & Compliance Agent** translates semantic matches into an clear compliance explanation.

### Scenario D: Grocery Margin Response (SUPPLY_CHAIN_ANALYTICS)
1. **Supervisor / Router Agent** identifies margins and inventory keywords.
2. **Sourcing Specialist Agent** queries stock levels and competitor prices.
3. **Synthesis & Compliance Agent** runs guardrail margin calculations and compiles an executive competitor response layout.
