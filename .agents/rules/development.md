# Farm2Door — Development Guidelines & Workflow Rule

## 1. Master Development Plan Mandate
- Whenever working on any feature, task, debugging, or modification in this codebase, you MUST ALWAYS consult and refer to [DEVELOPMENT_PLAN.md](file:///c:/Users/PC/Desktop/farm2door-website/DEVELOPMENT_PLAN.md).
- Adhere strictly to the stages defined in `DEVELOPMENT_PLAN.md`.
- Mark completed items `[x]` as stages progress.

## 2. Design System & Aesthetic Constraints
- **Zero Gradients Rule:** Strict instruction: Never use CSS gradients (`bg-gradient-*`, `linear-gradient`, `radial-gradient`). Only solid, elegant color blocking.
- **Palette Tokens:**
  - Phthalo Green: `#0D2E1C` (Primary dark & identity)
  - Pear Green: `#CFE73B` (High-contrast CTA & conversion)
  - Asparagus Green: `#6A9B48` (Botanical midtone, verification seals)
  - Acid Green: `#B5BA3E` (Harvest chips, ratings, prices)
  - Organic Cream: `#FAF8F2` (Canvas), `#FFFDF9` (Cards), `#F2ECE0` (Subtle), `#E5DBC7` (Border)

## 3. PRD Specifications
- Adhere strictly to [prd.md](file:///c:/Users/PC/Desktop/farm2door-website/prd.md).
- Enforce the 6 agricultural produce categories.
- Enforce the 5 local packaging units (`tuber`, `basket`, `crate`, `bundle`, `50kg bag`).
- Ensure ACID concurrency locking (`SELECT ... FOR UPDATE`) during checkout.
- Paystack reference format: `FD-YYYYMMDD-XXXXXX`.
- Parameterized SQL queries with prepared statements (`mysql2/promise`) against SQL injection.
