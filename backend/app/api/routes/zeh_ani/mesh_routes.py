"""Zeh Ani 3D Mesh Generation REST API endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.avatar_mesh import AvatarMesh, MeshSource, MeshStatus
from app.models.avatar_mesh_types import (
    MeshGenerationRequest,
    MeshGlbUrlResponse,
    MeshResponse,
)
from app.models.child_avatar import ChildAvatar
from app.models.user import User
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)
from app.models.biometric_consent import BiometricConsentType

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/mesh", tags=["zeh-ani"])


def _mesh_response(mesh: AvatarMesh) -> dict:
    """Convert AvatarMesh to API response dict."""
    return MeshResponse(
        id=str(mesh.id),
        avatar_id=mesh.avatar_id,
        user_id=mesh.user_id,
        status=mesh.status.value,
        source=mesh.source.value,
        has_glb=bool(mesh.glb_gcs_path),
        has_thumbnail=bool(mesh.thumbnail_gcs_path),
        blend_shapes=[
            {"name": bs.name, "default_weight": bs.default_weight}
            for bs in mesh.blend_shapes
        ],
        bone_count=mesh.bone_count,
        vertex_count=mesh.vertex_count,
        credits_charged=mesh.credits_charged,
        error_message=mesh.error_message,
        created_at=mesh.created_at.isoformat(),
        updated_at=mesh.updated_at.isoformat(),
    ).model_dump()


async def _run_mesh_generation(avatar_id: str) -> None:
    """Background task for mesh generation."""
    from app.services.zeh_ani.mesh_generation_service import (
        mesh_generation_service,
    )

    avatar = await ChildAvatar.get(avatar_id)
    if not avatar:
        return
    await mesh_generation_service.generate_mesh_from_selfie(avatar)


@router.post("/generate")
async def generate_mesh(
    request: MeshGenerationRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    """Generate a 3D mesh from the child's video selfie."""
    avatar = await ChildAvatar.find_one(
        ChildAvatar.user_id == str(user.id),
        ChildAvatar.profile_id == request.profile_id,
    )
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    if not avatar.video_selfie_gcs_path:
        raise HTTPException(
            status_code=400, detail="Video selfie required before mesh gen"
        )

    await biometric_consent_service.verify_pin(
        str(user.id), request.pin,
    )

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id),
        profile_id=request.profile_id,
        consent_type=BiometricConsentType.MESH_GENERATION,
    )
    if not has_consent:
        raise HTTPException(
            status_code=403,
            detail="Biometric consent required for mesh generation",
        )

    existing = await AvatarMesh.find_one(
        AvatarMesh.avatar_id == str(avatar.id)
    )
    if existing and existing.status == MeshStatus.GENERATING:
        return _mesh_response(existing)
    if existing and existing.is_ready:
        return _mesh_response(existing)

    background_tasks.add_task(_run_mesh_generation, str(avatar.id))

    mesh = existing
    if not mesh:
        from pymongo.errors import DuplicateKeyError

        try:
            mesh = AvatarMesh(
                avatar_id=str(avatar.id),
                user_id=str(user.id),
                profile_id=request.profile_id,
                status=MeshStatus.PENDING,
            )
            await mesh.insert()
        except DuplicateKeyError:
            mesh = await AvatarMesh.find_one(
                AvatarMesh.avatar_id == str(avatar.id),
            )

    return _mesh_response(mesh)


@router.get("/{avatar_id}")
async def get_mesh_status(
    avatar_id: str,
    user: User = Depends(get_current_user),
):
    """Get mesh generation status for an avatar."""
    mesh = await AvatarMesh.find_one(
        AvatarMesh.avatar_id == avatar_id,
        AvatarMesh.user_id == str(user.id),
    )
    if not mesh:
        raise HTTPException(status_code=404, detail="Mesh not found")
    return _mesh_response(mesh)


@router.get("/{avatar_id}/glb")
async def get_glb_url(
    avatar_id: str,
    user: User = Depends(get_current_user),
):
    """Get a signed URL for downloading the .glb mesh file."""
    mesh = await AvatarMesh.find_one(
        AvatarMesh.avatar_id == avatar_id,
        AvatarMesh.user_id == str(user.id),
    )
    if not mesh:
        raise HTTPException(status_code=404, detail="Mesh not found")
    if not mesh.is_ready or not mesh.glb_gcs_path:
        raise HTTPException(
            status_code=400, detail="Mesh is not ready for download"
        )

    from app.services.olorin.storage_service import storage_service

    expiry_seconds = settings.MESH_SIGNED_URL_EXPIRY_SECONDS
    signed_url = await storage_service.generate_signed_url(
        mesh.glb_gcs_path, expiry_seconds=expiry_seconds,
    )

    return MeshGlbUrlResponse(
        avatar_id=avatar_id,
        signed_url=signed_url,
        expires_in_seconds=expiry_seconds,
    ).model_dump()


@router.post("/upload-glb")
async def upload_glb_mesh(
    avatar_id: str = Form(...),
    profile_id: str = Form(...),
    pin: str = Form(...),
    glb_file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an on-device ARKit-generated GLB mesh directly."""
    from pymongo.errors import DuplicateKeyError

    from app.services.zeh_ani import deduct_zeh_ani_credits
    from app.services.zeh_ani.mesh_generation_helpers import (
        generate_mesh_thumbnail,
        parse_mesh_metadata,
        upload_glb_to_gcs,
        validate_glb_header,
    )

    await biometric_consent_service.verify_pin(str(user.id), pin)

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id),
        profile_id=profile_id,
        consent_type=BiometricConsentType.MESH_GENERATION,
    )
    if not has_consent:
        raise HTTPException(
            status_code=403,
            detail="Biometric consent required for mesh generation",
        )

    avatar = await ChildAvatar.find_one(
        ChildAvatar.user_id == str(user.id),
        ChildAvatar.profile_id == profile_id,
    )
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    glb_bytes = await glb_file.read()

    if len(glb_bytes) > settings.MAX_GLB_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="GLB file exceeds maximum upload size",
        )

    if not validate_glb_header(glb_bytes):
        raise HTTPException(
            status_code=400, detail="Invalid GLB file format",
        )

    blend_shapes, bone_count, vertex_count = parse_mesh_metadata(glb_bytes)
    gcs_path = await upload_glb_to_gcs(str(avatar.id), glb_bytes)
    thumbnail_path = await generate_mesh_thumbnail(
        str(avatar.id), glb_bytes,
    )

    credit_cost = settings.CREDIT_RATE_3D_MESH_ARKIT
    success, _remaining = await deduct_zeh_ani_credits(
        user_id=str(user.id),
        feature="3d_mesh_arkit",
        usage_amount=1.0,
        metadata={
            "avatar_id": str(avatar.id),
            "source": MeshSource.ARKIT.value,
        },
    )
    if not success:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credits for mesh upload",
        )

    existing = await AvatarMesh.find_one(
        AvatarMesh.avatar_id == str(avatar.id),
    )
    now = datetime.now(timezone.utc)

    if existing:
        existing.source = MeshSource.ARKIT
        existing.glb_gcs_path = gcs_path
        existing.thumbnail_gcs_path = thumbnail_path
        existing.blend_shapes = blend_shapes
        existing.bone_count = bone_count
        existing.vertex_count = vertex_count
        existing.status = MeshStatus.READY
        existing.credits_charged = credit_cost
        existing.error_message = None
        existing.updated_at = now
        await existing.save()
        mesh = existing
    else:
        try:
            mesh = AvatarMesh(
                avatar_id=str(avatar.id),
                user_id=str(user.id),
                profile_id=profile_id,
                source=MeshSource.ARKIT,
                glb_gcs_path=gcs_path,
                thumbnail_gcs_path=thumbnail_path,
                blend_shapes=blend_shapes,
                bone_count=bone_count,
                vertex_count=vertex_count,
                status=MeshStatus.READY,
                credits_charged=credit_cost,
                created_at=now,
                updated_at=now,
            )
            await mesh.insert()
        except DuplicateKeyError:
            mesh = await AvatarMesh.find_one(
                AvatarMesh.avatar_id == str(avatar.id),
            )

    avatar.mesh_id = str(mesh.id)
    avatar.mesh_status = "ready"
    avatar.has_3d_mesh = True
    avatar.updated_at = now
    await avatar.save()

    logger.info(
        "ARKit GLB mesh uploaded",
        extra={
            "avatar_id": str(avatar.id),
            "mesh_id": str(mesh.id),
            "blend_shapes": len(blend_shapes),
            "vertex_count": vertex_count,
        },
    )

    return _mesh_response(mesh)
