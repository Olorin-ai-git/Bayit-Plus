"""GCP billing provider via BigQuery export tables."""

from datetime import date
from decimal import Decimal

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class GCPBillingProvider(CostProvider):
    """Fetches real GCP costs from BigQuery billing export."""

    def __init__(self):
        """Initialize with billing config."""
        cfg = settings.olorin.gcp_billing
        self._enabled = cfg.enabled
        self._export_table = cfg.billing_export_table
        self._project_ids = cfg.project_ids
        self._data_lag_hours = cfg.data_lag_hours

    @circuit_breaker("gcp_billing")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch GCP costs from BigQuery billing export."""
        if not self._enabled or not self._export_table:
            logger.debug("GCP BigQuery billing disabled")
            return self._get_fallback_cost(start_date, end_date)

        try:
            total, by_project, by_service = await self._query_bq(
                start_date, end_date
            )
            breakdown = {**by_project, **by_service}
            return CostData(
                service_name="gcp",
                amount=total,
                start_date=start_date,
                end_date=end_date,
                breakdown=breakdown,
                metadata={
                    "source": "bigquery",
                    "table": self._export_table,
                    "lag_hours": self._data_lag_hours,
                },
            )
        except Exception as exc:
            logger.error(
                "GCP BigQuery query failed, using fallback",
                extra={"error": str(exc)},
            )
            return self._get_fallback_cost(start_date, end_date)

    async def _query_bq(
        self, start_date: date, end_date: date
    ) -> tuple[Decimal, dict[str, Decimal], dict[str, Decimal]]:
        """Run BigQuery against billing export table."""
        from google.cloud import bigquery

        client = bigquery.Client()
        project_filter = ", ".join(
            f"'{pid}'" for pid in self._project_ids
        )
        query = f"""
            SELECT
                project.id AS project_id,
                service.description AS service_desc,
                SUM(cost) + SUM(
                    IFNULL(
                        (SELECT SUM(c.amount) FROM UNNEST(credits) c),
                        0
                    )
                ) AS net_cost
            FROM `{self._export_table}`
            WHERE usage_start_time >= @start_date
              AND usage_start_time < @end_date
              AND project.id IN ({project_filter})
            GROUP BY project.id, service.description
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter(
                    "start_date", "DATE", start_date.isoformat()
                ),
                bigquery.ScalarQueryParameter(
                    "end_date", "DATE", end_date.isoformat()
                ),
            ]
        )

        query_job = client.query(query, job_config=job_config)
        rows = list(query_job.result())

        total = Decimal("0")
        by_project: dict[str, Decimal] = {}
        by_service: dict[str, Decimal] = {}

        for row in rows:
            cost = Decimal(str(row.net_cost))
            total += cost
            pid = row.project_id or "unknown"
            svc = row.service_desc or "unknown"
            by_project[f"project:{pid}"] = (
                by_project.get(f"project:{pid}", Decimal("0")) + cost
            )
            by_service[f"service:{svc}"] = (
                by_service.get(f"service:{svc}", Decimal("0")) + cost
            )

        logger.info(
            "GCP BigQuery costs fetched",
            extra={
                "total": str(total),
                "projects": len(by_project),
                "services": len(by_service),
            },
        )
        return total, by_project, by_service

    def _get_fallback_cost(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Return config-based estimate."""
        days = (end_date - start_date).days or 1
        daily = settings.olorin.infrastructure.gcp_monthly / 30
        return CostData(
            service_name="gcp",
            amount=Decimal(str(daily * days)),
            start_date=start_date,
            end_date=end_date,
            metadata={"source": "config_fallback"},
        )

    async def health_check(self) -> bool:
        """Verify BigQuery connectivity."""
        if not self._enabled:
            return True
        try:
            from google.cloud import bigquery

            client = bigquery.Client()
            client.query(f"SELECT 1 FROM `{self._export_table}` LIMIT 1")
            return True
        except Exception:
            return False
