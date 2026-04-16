"""Pre-deploy: wipe dev/QA trial orgs and associated data.

Usage:
    cd olorin-media/bayit-plus/backend
    poetry run python -m scripts.wipe_trial_orgs --env staging
    poetry run python -m scripts.wipe_trial_orgs --env staging --confirm

Per spec section 'Rollout' -- this is safe because:
  - Paid orgs (org_tier in {team, organization, enterprise}) are untouched.
  - Only orgs with org_tier="trial" are removed.
  - TrialHistory is cleared so re-trial dedup doesn't block fresh test signups.
  - Cascade-deletes TrainingUsers, TrainingProgress, TrainingAssignments
    belonging to deleted trial partner_ids.
"""
import argparse
import asyncio
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

TRIAL_FILTER = {"training_config.org_tier": "trial"}


async def main(confirm: bool, env: str) -> None:
    from app.core.database import connect_to_mongo_subset
    from app.models.integration_partner import IntegrationPartner
    from app.models.training_assignment import TrainingAssignment
    from app.models.training_progress import TrainingProgress
    from app.models.training_user import TrainingUser
    from app.models.trial_history import TrialHistory

    await connect_to_mongo_subset([
        IntegrationPartner,
        TrainingUser,
        TrainingProgress,
        TrainingAssignment,
        TrialHistory,
    ])

    # Identify trial orgs
    trial_partners = await IntegrationPartner.find(
        TRIAL_FILTER,
    ).to_list()
    trial_ids = [p.partner_id for p in trial_partners]

    logger.info(
        "[%s] Found %d trial org(s): %s",
        env, len(trial_ids), trial_ids,
    )

    # Count dependent records
    user_count = await TrainingUser.find(
        {"partner_id": {"$in": trial_ids}},
    ).count() if trial_ids else 0
    progress_count = await TrainingProgress.find(
        {"partner_id": {"$in": trial_ids}},
    ).count() if trial_ids else 0
    assignment_count = await TrainingAssignment.find(
        {"partner_id": {"$in": trial_ids}},
    ).count() if trial_ids else 0

    hist_count = await TrialHistory.find_all().count()

    logger.info(
        "[%s] Cascade targets: %d user(s), %d progress, %d assignment(s)",
        env, user_count, progress_count, assignment_count,
    )
    logger.info("[%s] TrialHistory records: %d", env, hist_count)

    if not confirm:
        logger.info("Dry-run mode. Pass --confirm to execute deletion.")
        return

    # Delete cascade: dependents first, then partners
    if trial_ids:
        dep_filter = {"partner_id": {"$in": trial_ids}}
        r = await TrainingAssignment.find(dep_filter).delete()
        logger.info("Deleted %d TrainingAssignment(s)", r.deleted_count)

        r = await TrainingProgress.find(dep_filter).delete()
        logger.info("Deleted %d TrainingProgress record(s)", r.deleted_count)

        r = await TrainingUser.find(dep_filter).delete()
        logger.info("Deleted %d TrainingUser(s)", r.deleted_count)

        r = await IntegrationPartner.find(TRIAL_FILTER).delete()
        logger.info("Deleted %d trial org(s)", r.deleted_count)

    if hist_count > 0:
        r = await TrialHistory.find_all().delete()
        logger.info("Cleared %d TrialHistory record(s)", r.deleted_count)

    logger.info("[%s] Cleanup complete.", env)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Wipe dev/QA trial orgs (pre-deploy cleanup)",
    )
    parser.add_argument(
        "--env", required=True,
        help="Environment label (staging/production)",
    )
    parser.add_argument(
        "--confirm", action="store_true",
        help="Actually execute deletion (default is dry-run)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.confirm, args.env))
