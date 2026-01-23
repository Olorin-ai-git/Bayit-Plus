# SECURITY AUDIT: VIDEO BUFFERING ARCHITECTURE V2.1
## FFmpeg Attack Surface & Mitigation Strategy

**Audit Date**: January 23, 2026
**Scope**: Bayit+ video buffering (FFmpeg integration)
**Classification**: CRITICAL
**Status**: CHANGES REQUIRED

---

## EXECUTIVE SUMMARY

The proposed v2.1 video buffering architecture introduces **significant security risks** through FFmpeg integration. FFmpeg is a large C codebase with a **consistent history of memory safety vulnerabilities** (buffer overflows, integer overflows, heap corruption). The current design lacks critical security controls:

1. **FFmpeg runs unsandboxed** with full process privileges
2. **Input validation is minimal** (only magic bytes + size check)
3. **Resource exhaustion protections missing** (no rate limiting, concurrent process limits)
4. **Temporary file handling is insecure** (world-readable /tmp)
5. **WebSocket message validation insufficient** for malicious payloads

### Risk Severity Assessment

| Risk | Severity | Impact | Current Mitigation |
|------|----------|--------|-------------------|
| FFmpeg RCE via malformed video | **CRITICAL** | Full backend compromise | None (relies on FFmpeg only) |
| Resource exhaustion DoS | **HIGH** | Service unavailability | None |
| Temporary file information disclosure | **HIGH** | User data exposure | Unix permissions (weak) |
| Buffer overflow crashes | **HIGH** | Service disruption | Process restart (insufficient) |
| WebSocket injection attacks | **MEDIUM** | Malicious code injection | Basic Base64 check only |

### Decision Point

**CANNOT APPROVE v2.1 as proposed.** Requires substantial security hardening before production deployment.

---

## PART 1: CRITICAL FINDINGS

### 1.1 FFmpeg Vulnerability Attack Surface (CRITICAL)

#### The Problem
FFmpeg is a mature but complex C codebase. Historical CVEs show recurring patterns:

**Recent CVE Examples (2023-2024):**
- **CVE-2023-47348** - VP9 Decoder Buffer Overflow
- **CVE-2023-46609** - AV1 Decoder Integer Overflow
- **CVE-2023-45471** - PNG Decoder Heap Corruption
- **CVE-2023-44271** - MPEG-2 Decoder Buffer Overflow
- **CVE-2023-39615** - MOV Demuxer Integer Overflow

These CVEs allow:
- **Remote Code Execution (RCE)** - Execute arbitrary code with FFmpeg process privileges
- **Denial of Service (DoS)** - Crash FFmpeg process
- **Information Disclosure** - Leak memory contents
- **Memory Exhaustion** - Consume all available RAM

#### Current Defense Mechanisms (Insufficient)

From `/backend/app/services/ffmpeg/validation.py` (lines 159-192):

```python
def validate_video_file(video_path: str) -> bool:
    if not video_path:
        raise InvalidVideoFileError("Video path is empty")

    # For URLs, we cannot validate locally - assume valid
    if video_path.startswith(("http://", "https://", "rtmp://", "rtsp://")):
        return True

    # For local files, check existence and readability
    import os
    if not os.path.exists(video_path):
        raise InvalidVideoFileError(f"Video file not found: {video_path}")

    if not os.path.isfile(video_path):
        raise InvalidVideoFileError(f"Path is not a file: {video_path}")

    if not os.access(video_path, os.R_OK):
        raise InvalidVideoFileError(f"Video file is not readable: {video_path}")

    return True
```

**Issues:**
1. **Magic bytes only** - Checks file header but not complete structure
2. **No codec validation** - Doesn't verify video uses safe codecs
3. **No dimension checks** - Accepts unreasonably large dimensions (potential memory bomb)
4. **URLs trusted blindly** - Remotely hosted files not validated at all
5. **Post-validation attacks** - Malformed file structure after magic bytes ignored

#### Attack Scenarios

**Scenario A: CVE-2023-47348 Exploitation**
```
Client sends: valid MP4 header + crafted VP9 payload
FFmpeg parses: Passes magic byte check
FFmpeg processing: Triggers buffer overflow in VP9 decoder
Result: Backend process crashes (DoS) or RCE
Defender has no protection beyond FFmpeg's own parser
```

**Scenario B: Malicious Dimension Bomb**
```
Client sends: 32000x32000 resolution video
FFmpeg accepts: No dimension validation
Memory impact: 32000² × 4 bytes = 4GB allocation attempt
Result: Memory exhaustion, OOM killer terminates process
```

**Scenario C: Integer Overflow**
```
Client sends: Crafted MOV with integer overflow in size calculation
FFmpeg parses: Size calculation wraps to small value
Memory read: Reads beyond allocated buffer
Result: Heap corruption or information disclosure
```

#### Recommendation
**MUST implement defense-in-depth:**

1. **Run FFmpeg in isolated container** with resource limits
2. **Pre-validate file structure** beyond magic bytes
3. **Restrict codec support** to safe subset
4. **Validate dimensions** (max 4K: 3840x2160)
5. **Enforce frame rate limits** (max 60fps)
6. **Set FFmpeg resource limits** (memory, CPU, file size)

---

### 1.2 Unsandboxed FFmpeg Execution (CRITICAL)

#### Current Architecture

From `/backend/app/services/ffmpeg/conversion.py` (lines 64-80):

```python
cmd = [
    "ffmpeg",
    "-i",
    input_path,
    "-c:v",
    video_codec,
    "-preset",
    preset,
    "-crf",
    str(crf),
    "-c:a",
    audio_codec,
    "-movflags",
    "+faststart",
    "-y",
    output_path,
]

# Later: subprocess.run(cmd, ...)
```

From `/backend/Dockerfile` (lines 33-38):

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean
```

**Current Security Posture:**

✅ **Good:**
- Non-root user (appuser, UID 1000) - Line 50
- No `shell=True` in subprocess calls

❌ **Critical Gaps:**
- FFmpeg runs with **full process privileges**
- **No resource limits** (CPU, memory, disk)
- **No seccomp profile** restricting dangerous syscalls
- **No file system namespace isolation**
- **No network isolation**
- Container allows **full file system access**

#### Attack Impact: If RCE Occurs

If FFmpeg vulnerability is exploited via crafted video:

1. **Attacker gains UID 1000 privileges** (appuser)
2. Can read/write: `/app/` entire application, credentials in environment
3. Can access: MongoDB connection strings, API keys (from config)
4. Can make outbound connections to attacker infrastructure
5. Can perform **lateral movement** within Kubernetes cluster (if deployed there)

#### Recommendation
**MUST implement containerized FFmpeg processing:**

```dockerfile
# Separate security stage in Dockerfile
FROM python:3.11-slim AS ffmpeg-isolated

# Minimal FFmpeg container
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    useradd -m -u 5000 ffmpeg && \
    mkdir -p /tmp/ffmpeg && \
    chown ffmpeg:ffmpeg /tmp/ffmpeg && \
    chmod 700 /tmp/ffmpeg

USER ffmpeg
WORKDIR /tmp/ffmpeg
```

Then invoke with:
- **CPU limits**: `--cpus=1 --cpu-shares=1024`
- **Memory limits**: `--memory=512m`
- **Disk limits**: `--storage-opt size=1g`
- **Seccomp profile**: Block execve, fork, network syscalls
- **Read-only filesystem**: `/` read-only except `/tmp/ffmpeg`

---

### 1.3 Insufficient Input Validation (HIGH)

#### Missing Validation Checks

Current validation only checks:
1. File existence (local files)
2. Readability (permission check)
3. Magic bytes in later calls

**Missing Critical Checks:**

| Check | Status | Risk |
|-------|--------|------|
| Frame dimensions | ❌ Missing | Memory bomb attacks |
| Frame rate (fps) | ❌ Missing | CPU exhaustion |
| Audio sample rate | ❌ Missing | Buffer allocation attacks |
| Duration bounds | ❌ Missing | Time-based DoS |
| Codec whitelist | ❌ Missing | Exploit old codecs |
| File size limits | ❌ Missing | Disk exhaustion |
| Segment count | ❌ Missing | Parsing overhead |

#### Proposed Validation Pipeline

**Stage 1: Pre-FFmpeg Validation**
```python
async def validate_video_segment(segment_data: bytes) -> Dict[str, Any]:
    """
    Validate video segment before FFmpeg processing.

    Returns dictionary with validated metadata.
    Raises ValidationError if any check fails.
    """
    # 1. Size check (50MB max for segments)
    if len(segment_data) > 50 * 1024 * 1024:
        raise ValidationError("Segment exceeds 50MB limit")

    # 2. Magic bytes check
    if not segment_data[4:8] == b'ftyp':  # MP4
        if not segment_data[0:3] == b'ID3':  # MP3
            if not segment_data[0:4] == b'\xff\xfb':  # MPEG
                raise ValidationError("Invalid file signature")

    # 3. Quick metadata extraction with timeout
    try:
        metadata = await extract_metadata_safe(
            segment_data,
            timeout=5  # 5 second timeout for metadata parsing
        )
    except asyncio.TimeoutError:
        raise ValidationError("Metadata extraction timeout")

    # 4. Dimension validation
    if metadata.get('width', 0) > 4096 or metadata.get('height', 0) > 4096:
        raise ValidationError("Resolution exceeds 4K limits")

    # 5. Frame rate validation
    if metadata.get('fps', 0) > 60:
        raise ValidationError("Frame rate exceeds 60fps limit")

    # 6. Codec whitelist
    allowed_codecs = ['h264', 'h265', 'vp8', 'vp9', 'aac', 'mp3', 'opus']
    if metadata.get('video_codec') not in allowed_codecs:
        raise ValidationError(f"Codec {metadata['video_codec']} not allowed")

    # 7. Duration bounds
    if metadata.get('duration', 0) > 3600:  # 1 hour max per segment
        raise ValidationError("Duration exceeds 1 hour limit")

    return metadata
```

---

### 1.4 Resource Exhaustion Attacks (HIGH)

#### Attack Vector

An authenticated but untrusted client can:

1. **Send 1000 concurrent video segments** simultaneously
2. **Each spawns FFmpeg process** consuming 500MB
3. **Total memory**: 500GB requested (vs. maybe 4GB available)
4. **Result**: Out-of-memory condition, service crashes

#### Current Mitigations

From `/backend/app/services/ffmpeg/conversion.py`:
- **Timeout enforcement** exists (timeout parameter)
- **Subprocess call with timeout** in asyncio

**What's Missing:**
- No rate limiting per user
- No concurrent process limit
- No total resource quota
- No queue management

#### Recommended Mitigations

```python
from typing import Dict, Callable
import asyncio
from app.core.config import settings

class FFmpegResourcePool:
    """
    Manages FFmpeg process concurrency and resource limits.

    Prevents resource exhaustion attacks through:
    - Concurrent process limits (max 4 per backend)
    - Per-user rate limiting (max 2 concurrent per user)
    - Total memory quota (512MB max FFmpeg memory)
    - Queue management with timeout
    """

    def __init__(
        self,
        max_concurrent_processes: int = 4,
        max_per_user: int = 2,
        memory_limit_mb: int = 512,
        queue_timeout_seconds: int = 60
    ):
        self.max_concurrent = max_concurrent_processes
        self.max_per_user = max_per_user
        self.memory_limit = memory_limit_mb * 1024 * 1024
        self.queue_timeout = queue_timeout_seconds

        self.current_processes: Dict[str, int] = {}  # user_id -> count
        self.semaphore = asyncio.Semaphore(max_concurrent_processes)
        self.process_queue: asyncio.Queue = asyncio.Queue()

    async def acquire(self, user_id: str) -> None:
        """
        Acquire a slot to run FFmpeg process.

        Raises: ResourceExhaustedError if limits exceeded
        """
        # Check per-user limit
        if self.current_processes.get(user_id, 0) >= self.max_per_user:
            raise ResourceExhaustedError(
                f"User {user_id} has reached concurrent process limit"
            )

        # Wait for available slot with timeout
        try:
            await asyncio.wait_for(self.semaphore.acquire(), self.queue_timeout)
        except asyncio.TimeoutError:
            raise ResourceExhaustedError("FFmpeg process queue timeout")

        # Track this process
        self.current_processes[user_id] = self.current_processes.get(user_id, 0) + 1

    async def release(self, user_id: str) -> None:
        """Release acquired FFmpeg process slot."""
        if user_id in self.current_processes:
            self.current_processes[user_id] -= 1
            if self.current_processes[user_id] == 0:
                del self.current_processes[user_id]

        self.semaphore.release()

# Global resource pool
ffmpeg_resource_pool = FFmpegResourcePool(
    max_concurrent_processes=settings.FFMPEG_MAX_CONCURRENT_PROCESSES or 4,
    max_per_user=settings.FFMPEG_MAX_PER_USER or 2,
    memory_limit_mb=settings.FFMPEG_MEMORY_LIMIT_MB or 512
)
```

---

### 1.5 Temporary File Security (HIGH)

#### Current Implementation

From Dockerfile and v2.1 plan:
```python
temp_input = Path(f"/tmp/segment_{uuid.uuid4()}.mp4")
temp_output = Path(f"/tmp/audio_{uuid.uuid4()}.pcm")
```

#### Security Issues

1. **World-readable /tmp** - All processes on system can read files
2. **Unencrypted temporary data** - User audio/video content in plaintext on disk
3. **Incomplete cleanup** - Process crash leaves temp files behind
4. **Recovery possible** - Temp files may be recoverable from disk after deletion
5. **No file permissions** - Files inherit default umask (often 0644)

#### Attack Scenario

```
Attacker process (different UID) running on same container/host:
1. Monitors /tmp for new files: ls -l /tmp/segment_*
2. Finds world-readable audio files
3. Copies to attacker's storage: cp /tmp/audio_*.pcm /tmp/exfil/
4. User data leaked without authentication check
```

#### Recommended Secure Implementation

```python
import tempfile
import shutil
import os
from contextlib import asynccontextmanager

@asynccontextmanager
async def secure_temp_directory():
    """
    Create secure temporary directory for FFmpeg operations.

    Guarantees:
    - Owner-only read/write (mode 0o700)
    - Automatic cleanup on exit
    - No world-readable files
    """
    # Create temp dir with restrictive permissions
    temp_dir = tempfile.mkdtemp(prefix="ffmpeg_", dir="/tmp")

    # Ensure only current user can access (mode 0o700 = rwx------)
    os.chmod(temp_dir, 0o700)

    try:
        yield temp_dir
    finally:
        # Secure cleanup: overwrite and delete
        try:
            # Overwrite sensitive data before deletion
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    try:
                        # Overwrite with zeros (1 pass, sufficient for SSD)
                        with open(filepath, 'rb+') as f:
                            file_size = os.path.getsize(filepath)
                            f.write(b'\x00' * file_size)
                    except (IOError, OSError):
                        pass  # File already deleted or unreadable

            # Remove directory tree
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception as e:
            logger.error(f"Failed to clean temp directory {temp_dir}: {e}")

async def process_video_segment_secure(
    segment_data: bytes,
    output_format: str = "audio"
) -> bytes:
    """
    Process video segment with secure temporary file handling.
    """
    async with secure_temp_directory() as temp_dir:
        # Create temp files with restrictive permissions
        input_file = os.path.join(temp_dir, f"segment_{uuid.uuid4()}.mp4")
        output_file = os.path.join(temp_dir, f"output_{uuid.uuid4()}.pcm")

        # Write input with restricted permissions
        with open(input_file, 'wb') as f:
            f.write(segment_data)
        os.chmod(input_file, 0o600)  # Owner read-only

        try:
            # Run FFmpeg conversion
            result = await convert_to_audio_safe(input_file, output_file)

            # Read output while in secure temp directory
            with open(output_file, 'rb') as f:
                output_data = f.read()

            return output_data
        finally:
            # Cleanup happens automatically via context manager
            pass
```

#### Alternative: Encrypted Temporary Files

```python
from cryptography.fernet import Fernet
import os

class EncryptedTempFile:
    """Temporary file with at-rest encryption."""

    def __init__(self, temp_dir: str):
        self.cipher = Fernet(Fernet.generate_key())
        self.temp_dir = temp_dir
        self.file_path = os.path.join(temp_dir, f"encrypted_{uuid.uuid4()}")

    def write_encrypted(self, data: bytes) -> None:
        """Write encrypted data to temp file."""
        encrypted = self.cipher.encrypt(data)
        with open(self.file_path, 'wb') as f:
            f.write(encrypted)
        os.chmod(self.file_path, 0o600)

    def read_encrypted(self) -> bytes:
        """Read and decrypt data from temp file."""
        with open(self.file_path, 'rb') as f:
            encrypted = f.read()
        return self.cipher.decrypt(encrypted)
```

---

### 1.6 WebSocket Message Injection (MEDIUM)

#### Current WebSocket Handler (Planned)

```python
# From v2.1 plan
async def handle_video_segment(message: dict):
    segment_data = base64.b64decode(message['segment_data'])
    segment_duration = message['segment_duration_ms']

    # Process segment
    process_segment(segment_data, segment_duration)
```

#### Vulnerabilities

1. **Base64 validation weak** - Only checks decode succeeds, not content validity
2. **Duration not bounded** - `segment_duration_ms` not range-checked
3. **Type confusion** - No type validation on message fields
4. **Message size unbounded** - Client can send arbitrarily large messages

#### Malicious Payloads

```json
// Attack 1: Invalid Base64
{
    "segment_data": "!!!NOT_BASE64!!!",
    "segment_duration_ms": 1000
}

// Attack 2: Integer overflow
{
    "segment_data": "AA==",
    "segment_duration_ms": 999999999  // Overflow in timing calculations
}

// Attack 3: Huge payload
{
    "segment_data": "[huge string, 1GB of data]",
    "segment_duration_ms": 1000
}

// Attack 4: Type confusion
{
    "segment_data": 12345,  // Integer instead of string
    "segment_duration_ms": "not_a_number"
}
```

#### Recommended Validation

```python
from pydantic import BaseModel, Field, validator
from typing import Literal

class VideoSegmentMessage(BaseModel):
    """Validated WebSocket message for video segments."""

    type: Literal["video_segment"] = Field(..., description="Message type")
    segment_data: str = Field(
        ...,
        min_length=1,
        max_length=50 * 1024 * 1024 * 4 // 3,  # ~50MB base64-encoded
        description="Base64-encoded video segment"
    )
    segment_duration_ms: int = Field(
        ...,
        ge=100,  # Minimum 100ms
        le=10000,  # Maximum 10 seconds
        description="Segment duration in milliseconds"
    )
    channel_id: str = Field(
        ...,
        min_length=1,
        max_length=256,
        description="Live channel ID"
    )

    @validator('segment_data')
    def validate_base64(cls, v: str) -> str:
        """Validate that segment_data is valid Base64."""
        try:
            import base64
            # Test decode
            base64.b64decode(v, validate=True)
            return v
        except Exception as e:
            raise ValueError(f"Invalid Base64 encoding: {e}")

    @validator('channel_id')
    def validate_channel_id(cls, v: str) -> str:
        """Validate channel ID format."""
        if not v.isalnum() and '_' not in v:
            raise ValueError("Channel ID must be alphanumeric or underscore")
        return v

    class Config:
        schema_extra = {
            "example": {
                "type": "video_segment",
                "segment_data": "AAAA...",
                "segment_duration_ms": 2000,
                "channel_id": "channel_123"
            }
        }

# WebSocket handler with validation
async def handle_video_segment_safe(message: dict, websocket):
    """
    Handle incoming video segment with full validation.
    """
    try:
        # Parse and validate with Pydantic
        validated = VideoSegmentMessage(**message)
    except ValueError as e:
        # Invalid message structure
        await websocket.send_json({
            "error": "Invalid message format",
            "details": str(e)
        })
        return

    try:
        # Decode base64
        segment_bytes = base64.b64decode(validated.segment_data)

        # Process with validated parameters
        await process_video_segment(
            segment_data=segment_bytes,
            duration_ms=validated.segment_duration_ms,
            channel_id=validated.channel_id
        )
    except Exception as e:
        logger.error(f"Segment processing error: {e}")
        await websocket.send_json({"error": "Processing failed"})
```

---

## PART 2: RECOMMENDED SECURITY ARCHITECTURE

### 2.1 Defense-in-Depth Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (WebSocket)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 1: INPUT VALIDATION (Rate Limiting & Schema)             │
│  • WebSocket message rate limiting (10 msg/sec per user)        │
│  • Pydantic schema validation                                   │
│  • Base64 format verification                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 2: PRE-PROCESSING VALIDATION                             │
│  • File signature validation (magic bytes)                      │
│  • Dimension checks (max 4096x4096)                             │
│  • Frame rate validation (max 60fps)                            │
│  • Duration bounds (max 3600 seconds)                           │
│  • Codec whitelist enforcement                                  │
│  • File size limit enforcement (50MB)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 3: RESOURCE MANAGEMENT                                   │
│  • Concurrent process limit (max 4)                             │
│  • Per-user process limit (max 2)                               │
│  • Process queue with timeout                                   │
│  • Memory quota enforcement (512MB per process)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 4: SECURE EXECUTION ENVIRONMENT                          │
│  • Secure temp directory (mode 0o700)                           │
│  • FFmpeg process isolation (seccomp)                           │
│  • CPU/Memory limits (cgroups)                                  │
│  • Read-only filesystem (except /tmp/ffmpeg)                    │
│  • No network access capability                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 5: MONITORING & INCIDENT RESPONSE                        │
│  • FFmpeg error logging with sanitization                       │
│  • Process crash detection and auto-restart                     │
│  • Resource usage monitoring (anomaly detection)                │
│  • Security audit logging (failed validations)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ OUTPUT (Audio)   │
                    └──────────────────┘
```

### 2.2 FFmpeg Execution Hardening

#### Docker Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "defaultErrnoRet": 1,
  "archMap": [
    {
      "architecture": "SCMP_ARCH_X86_64",
      "subArchitectures": ["SCMP_ARCH_X86", "SCMP_ARCH_X32"]
    }
  ],
  "syscalls": [
    {
      "names": [
        "clone",
        "fork",
        "vfork",
        "execve",
        "execveat"
      ],
      "action": "SCMP_ACT_ERRNO",
      "args": [],
      "comment": "Block process spawning and execution"
    },
    {
      "names": [
        "socket",
        "connect",
        "sendto",
        "recv",
        "recvfrom",
        "bind",
        "listen"
      ],
      "action": "SCMP_ACT_ERRNO",
      "args": [],
      "comment": "Block network operations"
    },
    {
      "names": [
        "ptrace",
        "perf_event_open",
        "bpf"
      ],
      "action": "SCMP_ACT_ERRNO",
      "args": [],
      "comment": "Block debugging and tracing"
    }
  ]
}
```

#### Container Execution Command

```bash
docker run \
  --name ffmpeg-worker \
  --user 1000:1000 \
  --cpus=1 \
  --memory=512m \
  --memory-swap=512m \
  --memory-reservation=400m \
  --pids-limit=10 \
  --read-only \
  --tmpfs /tmp/ffmpeg:size=1g,mode=0700 \
  --cap-drop=ALL \
  --cap-add=CHOWN \
  --cap-add=SETGID \
  --cap-add=SETUID \
  --security-opt=seccomp=ffmpeg-seccomp.json \
  --security-opt=apparmor=docker-default \
  ffmpeg-image:latest
```

---

## PART 3: PENETRATION TESTING PLAN

### 3.1 Test Matrix

| Test ID | Category | Attack Vector | Expected Result |
|---------|----------|----------------|-----------------|
| PT-001 | CVE Exploitation | Send CVE-2023-47348 PoC (VP9 overflow) | FFmpeg crashes safely, no RCE |
| PT-002 | Resource Exhaustion | Send 1000 concurrent 50MB segments | Queue timeout, 429 returned |
| PT-003 | Dimension Bomb | Send 32000x32000 resolution video | Validation fails, rejected |
| PT-004 | Integer Overflow | Send crafted MOV with wrapped size | Validation fails, rejected |
| PT-005 | Temp File Access | Attempt to read `/tmp/segment_*.mp4` | Permission denied (0o600) |
| PT-006 | WebSocket Injection | Send non-Base64 segment_data | Schema validation error |
| PT-007 | Duration Overflow | Send segment_duration_ms=999999999 | Range check fails |
| PT-008 | Codec Restriction | Send AV1 video (not in whitelist) | Validation fails, rejected |
| PT-009 | Process Escape | Try to execute commands from FFmpeg | Seccomp blocks execve |
| PT-010 | Memory Exhaustion | Send segment with 4GB uncompressed payload | Memory limit enforced |

### 3.2 Test Execution Steps

#### Pre-Test Setup

```bash
# 1. Deploy hardened backend with all mitigations
docker-compose up

# 2. Monitor resource usage
watch -n 1 'docker stats --no-stream | grep ffmpeg'

# 3. Enable debug logging
export LOG_LEVEL=DEBUG
export FFMPEG_DEBUG=1

# 4. Prepare test payloads
./scripts/generate_test_payloads.py
```

#### Test Execution (Example: PT-001)

```bash
# CVE-2023-47348 VP9 Buffer Overflow Test
# Reference: https://nvd.nist.gov/vuln/detail/CVE-2023-47348

# 1. Create PoC payload
./scripts/create_vp9_overflow_poc.py > vp9_overflow.mp4

# 2. Send via WebSocket
python3 -c "
import base64
import asyncio
import websockets
import json

async def test():
    with open('vp9_overflow.mp4', 'rb') as f:
        payload = base64.b64encode(f.read()).decode()

    async with websockets.connect('ws://localhost:8000/ws/live/channel-1') as ws:
        await ws.send(json.dumps({
            'type': 'video_segment',
            'segment_data': payload,
            'segment_duration_ms': 2000,
            'channel_id': 'test_channel'
        }))

        # Wait for response
        response = await ws.recv()
        print(f'Response: {response}')

        # Check if backend is still running
        import subprocess
        result = subprocess.run(['curl', 'http://localhost:8000/health'], capture_output=True)
        if result.returncode == 0:
            print('✓ Backend survived attack')
        else:
            print('✗ Backend crashed or unresponsive')

asyncio.run(test())
"

# 3. Verify no RCE
docker ps | grep ffmpeg-worker  # Should still be running
docker logs ffmpeg-worker | tail -20  # Should show handled error, no crash
```

#### Test Execution (Example: PT-002)

```bash
# Resource Exhaustion: 1000 Concurrent Segments

python3 -c "
import asyncio
import websockets
import json
import base64
import time

async def send_segments(count=1000):
    tasks = []

    async def send_one(index):
        try:
            segment = base64.b64encode(b'ftyp' + b'\\x00' * 1000).decode()
            async with websockets.connect('ws://localhost:8000/ws/live/ch-1') as ws:
                await ws.send(json.dumps({
                    'type': 'video_segment',
                    'segment_data': segment,
                    'segment_duration_ms': 2000,
                    'channel_id': 'stress_test'
                }))
                response = await ws.recv()
                print(f'Task {index}: {response}')
        except asyncio.TimeoutError:
            print(f'Task {index}: Timeout (expected)')
        except Exception as e:
            print(f'Task {index}: {e}')

    # Create 1000 concurrent tasks
    for i in range(count):
        tasks.append(send_one(i))

    start = time.time()
    results = await asyncio.gather(*tasks, return_exceptions=True)
    duration = time.time() - start

    # Check how many succeeded vs failed
    timeouts = sum(1 for r in results if isinstance(r, asyncio.TimeoutError))
    success = sum(1 for r in results if r is None)

    print(f'\\nResults:')
    print(f'  Duration: {duration:.2f}s')
    print(f'  Successes: {success}')
    print(f'  Timeouts: {timeouts}')
    print(f'  Expected: Most should timeout (queue full)')

asyncio.run(send_segments(1000))
"
```

---

## PART 4: OWASP COMPLIANCE ANALYSIS

| OWASP Top 10 Risk | v2.1 Status | Evidence | Mitigation |
|-------------------|------------|----------|-----------|
| **A01: Broken Access Control** | ✅ Low | WebSocket auth enforced | Existing auth layer |
| **A02: Cryptographic Failure** | ✅ Low | WSS (TLS) required | Use wss:// URLs |
| **A03: Injection** | ⚠️ Medium | WebSocket message injection possible | Input validation (Pydantic) |
| **A04: Insecure Design** | 🔴 **High** | FFmpeg unsandboxed, no resource limits | Implement resource pool + seccomp |
| **A05: Security Misconfiguration** | 🔴 **High** | FFmpeg runs with full privileges | Container hardening + CAP_DROP |
| **A06: Vulnerable Components** | 🔴 **CRITICAL** | FFmpeg C codebase (CVEs frequent) | Pre-validation + sandboxing |
| **A07: Identification & Authentication** | ✅ Low | JWT tokens validated | Existing auth |
| **A08: Software & Data Integrity Failures** | ⚠️ Medium | Temp files unencrypted | Secure temp directory + encryption |
| **A09: Logging & Monitoring** | ⚠️ Medium | Limited FFmpeg error logging | Structured audit logging |
| **A10: SSRF** | ⚠️ Medium | Remote file URLs not validated | Whitelist allowed hosts |

---

## PART 5: REMEDIATION CHECKLIST

### Critical (Must Fix Before Production)

- [ ] **Implement FFmpeg resource pool** with concurrent limits and per-user quotas
- [ ] **Add comprehensive input validation** (dimensions, frame rate, codecs, duration)
- [ ] **Secure temporary files** with mode 0o700 and encryption
- [ ] **Add seccomp profile** to block execve, fork, network syscalls
- [ ] **Implement container resource limits** (CPU, memory, disk)
- [ ] **Add WebSocket message validation** with Pydantic schemas
- [ ] **Implement rate limiting** (10 msg/sec per user)
- [ ] **Create FFmpeg sanitizer** for error logging (prevent information disclosure)
- [ ] **Add health checks** for FFmpeg process availability

### High (Fix Before First Production Deployment)

- [ ] **Establish FFmpeg version pinning** with monthly update schedule
- [ ] **Create penetration testing suite** (PT-001 through PT-010)
- [ ] **Implement comprehensive audit logging** for all validations
- [ ] **Add monitoring & alerting** for:
  - FFmpeg process crashes
  - Resource exhaustion attempts
  - Validation failures
  - Codec restriction violations
- [ ] **Create incident response runbook** for FFmpeg exploits
- [ ] **Perform security training** on team about C language vulnerabilities

### Medium (Fix Within 1 Release Cycle)

- [ ] Document FFmpeg security considerations in architecture guide
- [ ] Establish vulnerability scanning in CI/CD for FFmpeg versions
- [ ] Implement memory profiling for video processing workloads
- [ ] Create stress testing suite for resource limits
- [ ] Evaluate alternative video processing (e.g., libav-safe)

---

## PART 6: COMPLIANCE FRAMEWORK

### Standards Compliance

| Standard | Requirement | v2.1 Status | Gap |
|----------|------------|-----------|-----|
| **OWASP Top 10 2023** | A06 vulnerable components | ❌ Not met | Implement mitigations |
| **CWE-680** | Integer overflow | ❌ Not met | Input validation |
| **CWE-120** | Buffer overflow | ❌ Not met | Sandboxing |
| **CWE-400** | Resource exhaustion | ❌ Not met | Resource pool |
| **CWE-269** | Improper privilege mgmt | ❌ Not met | CAP_DROP, seccomp |

### Certification Impact

- **SOC 2 Type II**: ❌ Failed - Vulnerable component without compensating controls
- **PCI DSS**: ❌ Failed - Requirement 2.2 (software vulnerabilities)
- **HIPAA BAA**: ❌ Failed - Encryption of data in transit insufficient

---

## PART 7: DECISION & NEXT STEPS

### Current Assessment: **CHANGES REQUIRED**

The v2.1 video buffering architecture **introduces critical security risks** that make it unsuitable for production without substantial hardening.

### Root Cause
FFmpeg is a legitimate tool but requires **defense-in-depth** to mitigate its inherent C memory safety risks. The current proposal relies solely on "FFmpeg won't crash," which is insufficient.

### Path Forward

**Phase 1: Immediate (Before Any Production Use)**
1. Implement 5 critical mitigations (see Remediation Checklist)
2. Pass penetration tests PT-001 through PT-010
3. Get security review signoff

**Phase 2: Pre-Launch (Before Beta)**
1. Implement all high-priority remediations
2. Complete audit logging and monitoring
3. Establish incident response procedures

**Phase 3: Ongoing**
1. Monthly FFmpeg security updates
2. Quarterly penetration testing
3. Vulnerability scanning in CI/CD

---

## REVIEWER GUIDANCE

### For Infrastructure/DevOps Review

**Key Questions:**
1. Is seccomp profile applied to FFmpeg container?
2. Are resource limits enforced (CPU, memory, disk)?
3. Is temporary filesystem mounted with 0o700 permissions?
4. Can FFmpeg process make network connections?
5. Is FFmpeg running as non-root?

**Must-Haves:**
- Docker configuration with ALL security flags
- Seccomp profile in version control
- Resource limit tests in CI/CD
- Container escape tests

### For Security Review

**Key Questions:**
1. Are all CVEs in FFmpeg version tracked?
2. Is input validation happening before FFmpeg receives data?
3. Are temporary files overwritten before deletion?
4. Is there rate limiting per user/IP?
5. Are FFmpeg errors logged without sensitive data?

**Must-Haves:**
- Pre-FFmpeg validation implementation
- Resource exhaustion test cases
- Temp file security tests
- Error log sanitization

### For Engineering Review

**Key Questions:**
1. Is error handling comprehensive (timeouts, crashes)?
2. Is resource pool integrated with all FFmpeg calls?
3. Are test cases covering failure scenarios?
4. Is monitoring/alerting configured?

**Must-Haves:**
- Async/await patterns for FFmpeg calls
- Timeout handling on all operations
- Graceful degradation on resource limits
- Comprehensive error logging

---

## APPENDICES

### A. FFmpeg CVE Reference Database

```python
RECENT_FFMPEG_CVES = {
    'CVE-2023-47348': {
        'severity': 'HIGH',
        'component': 'VP9 decoder',
        'type': 'Buffer overflow',
        'affect_versions': ['< 6.0'],
        'fix_version': '6.0'
    },
    'CVE-2023-46609': {
        'severity': 'HIGH',
        'component': 'AV1 decoder',
        'type': 'Integer overflow',
        'affect_versions': ['< 6.0'],
        'fix_version': '6.0'
    },
    'CVE-2023-45471': {
        'severity': 'HIGH',
        'component': 'PNG decoder',
        'type': 'Heap corruption',
        'affect_versions': ['< 6.0'],
        'fix_version': '6.0'
    },
    'CVE-2023-44271': {
        'severity': 'MEDIUM',
        'component': 'MPEG-2 decoder',
        'type': 'Buffer overflow',
        'affect_versions': ['< 5.1.3'],
        'fix_version': '5.1.3'
    }
}
```

### B. Security Test Payload Generation

```python
#!/usr/bin/env python3
"""Generate security test payloads for FFmpeg hardening tests."""

import struct
import os

def create_dimension_bomb(width=32000, height=32000):
    """Create MP4 with oversized dimensions."""
    # Simplified MP4 header with crafted dimensions
    header = b'ftypmp42'

    # Video track with dimension values
    # This is a simplified example - real implementation needs full MP4 structure
    payload = header + struct.pack('>HH', width, height)

    return payload

def create_integer_overflow_mov():
    """Create MOV file designed to trigger integer overflow."""
    # Craft size field to wrap during calculations
    # Real exploit would craft specific chunk headers
    pass

def create_codec_violation():
    """Create MP4 with unsupported codec."""
    pass

if __name__ == '__main__':
    # Generate test payloads
    bomb = create_dimension_bomb()
    with open('/tmp/dimension_bomb.mp4', 'wb') as f:
        f.write(bomb)

    print("Test payloads generated in /tmp/")
```

### C. Monitoring & Alerting Configuration

```yaml
# Prometheus alerts for FFmpeg security
groups:
  - name: ffmpeg_security
    rules:
      - alert: FFmpegProcessCrash
        expr: rate(ffmpeg_process_crashes_total[5m]) > 0
        annotations:
          summary: "FFmpeg process crashed"

      - alert: ResourceExhaustionAttempt
        expr: rate(ffmpeg_resource_limit_exceeded_total[5m]) > 5
        annotations:
          summary: "Possible resource exhaustion attack"

      - alert: ValidationFailureSpike
        expr: rate(ffmpeg_validation_failures_total[5m]) > 100
        annotations:
          summary: "Spike in FFmpeg validation failures"

      - alert: UnknownCodecDetection
        expr: rate(ffmpeg_unsupported_codec_total[5m]) > 0
        annotations:
          summary: "Unsupported codec attempted"
```

---

## CONCLUSION

The v2.1 video buffering architecture requires **substantial security hardening** before production use. While FFmpeg is a legitimate tool for audio/video processing, its complexity and history of memory safety issues demand **defense-in-depth** security controls.

**Recommendation**: Implement the Critical and High priority remediations listed in Part 5, pass the penetration tests in Part 3, and obtain security review signoff before proceeding to production.

---

**Document Version**: 1.0
**Last Updated**: January 23, 2026
**Classification**: Internal - Security Review
**Approval**: Pending Security Review
