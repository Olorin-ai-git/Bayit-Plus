-- Verify Domain Findings Persistence
-- This SQL query checks if domain_findings are persisted in progress_json and results_json
-- Usage: Run this query against your PostgreSQL database

-- Replace 'inv-1762538988633' with your investigation_id
-- Example: WHERE investigation_id = 'inv-1762538988633'

-- Query 1: Summary of domain_findings in both progress_json and results_json
WITH investigation_data AS (
    SELECT 
        investigation_id,
        status,
        lifecycle_stage,
        version,
        created_at,
        updated_at,
        progress_json,
        results_json,
        -- Extract domain_findings from progress_json
        CASE 
            WHEN progress_json IS NOT NULL THEN
                progress_json::jsonb->'domain_findings'
            ELSE NULL
        END AS progress_domain_findings,
        -- Extract domain_findings from results_json
        CASE 
            WHEN results_json IS NOT NULL THEN
                results_json::jsonb->'domain_findings'
            ELSE NULL
        END AS results_domain_findings
    FROM investigation_states
    WHERE investigation_id = 'inv-1762538988633'  -- Replace with your investigation_id
)
SELECT 
    investigation_id,
    status,
    lifecycle_stage,
    version,
    created_at,
    updated_at,
    -- Progress JSON analysis
    CASE 
        WHEN progress_json IS NULL THEN 'NULL'
        ELSE 'EXISTS (' || length(progress_json) || ' chars)'
    END AS progress_json_status,
    CASE 
        WHEN progress_domain_findings IS NULL THEN 'NOT FOUND'
        WHEN jsonb_typeof(progress_domain_findings) = 'object' THEN 
            'FOUND (' || jsonb_object_keys(progress_domain_findings) || ' domains)'
        ELSE 'INVALID TYPE'
    END AS progress_domain_findings_status,
    -- Results JSON analysis
    CASE 
        WHEN results_json IS NULL THEN 'NULL'
        ELSE 'EXISTS (' || length(results_json) || ' chars)'
    END AS results_json_status,
    CASE 
        WHEN results_domain_findings IS NULL THEN 'NOT FOUND'
        WHEN jsonb_typeof(results_domain_findings) = 'object' THEN 
            'FOUND (' || jsonb_object_keys(results_domain_findings) || ' domains)'
        ELSE 'INVALID TYPE'
    END AS results_domain_findings_status,
    -- Show domain names from progress_json
    (
        SELECT jsonb_object_keys(progress_domain_findings)
        FROM investigation_data
        WHERE progress_domain_findings IS NOT NULL
        LIMIT 1
    ) AS progress_domains_preview,
    -- Show domain names from results_json
    (
        SELECT jsonb_object_keys(results_domain_findings)
        FROM investigation_data
        WHERE results_domain_findings IS NOT NULL
        LIMIT 1
    ) AS results_domains_preview
FROM investigation_data;

-- Detailed query: Show all domains and their risk scores
SELECT 
    'progress_json' AS source,
    domain_key AS domain,
    domain_value->>'risk_score' AS risk_score,
    domain_value->>'confidence' AS confidence,
    CASE 
        WHEN domain_value->'llm_analysis' IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS has_llm_analysis,
    domain_value->'llm_analysis'->>'confidence' AS llm_confidence
FROM investigation_states,
LATERAL jsonb_each(progress_json::jsonb->'domain_findings') AS domain(domain_key, domain_value)
WHERE investigation_id = 'inv-1762538988633'
  AND progress_json IS NOT NULL
  AND progress_json::jsonb->'domain_findings' IS NOT NULL

UNION ALL

SELECT 
    'results_json' AS source,
    domain_key AS domain,
    domain_value->>'risk_score' AS risk_score,
    domain_value->>'confidence' AS confidence,
    CASE 
        WHEN domain_value->'llm_analysis' IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS has_llm_analysis,
    domain_value->'llm_analysis'->>'confidence' AS llm_confidence
FROM investigation_states,
LATERAL jsonb_each(results_json::jsonb->'domain_findings') AS domain(domain_key, domain_value)
WHERE investigation_id = 'inv-1762538988633'
  AND results_json IS NOT NULL
  AND results_json::jsonb->'domain_findings' IS NOT NULL
ORDER BY source, domain;

