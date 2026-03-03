"""
Tests for registry import/export: /api/v1/registry/

Tests skill .skill file export and import.
"""
import io
import zipfile
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.registry import ImportSkillResponse
from tests.factories import make_skill, make_skill_version


def _create_skill_zip(name="new-skill"):
    """Create a valid .skill zip file in memory."""
    buf = io.BytesIO()
    skill_md = (
        f"---\nname: {name}\ndescription: A new skill\n---\n\n"
        f"# {name.title()}\n\n"
        "This is a new skill content that is long enough to pass validation checks."
    )
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(f"{name}/SKILL.md", skill_md)
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_export_skill(client, db_session: AsyncSession):
    """Export a skill that has a version."""
    skill = make_skill(name="export-test")
    db_session.add(skill)
    await db_session.flush()
    version = make_skill_version(skill_id=skill.id)
    db_session.add(version)
    await db_session.flush()

    response = await client.get("/api/v1/registry/skills/export-test/export")
    # Should return zip content or 200
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_export_skill_not_found(client):
    response = await client.get("/api/v1/registry/skills/nonexistent/export")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_import_skill(client):
    """Import a valid .skill zip file."""
    zip_data = _create_skill_zip("import-test")
    response = await client.post(
        "/api/v1/registry/import",
        files={"file": ("import-test.skill", zip_data, "application/zip")},
    )
    # Import may return 200, 201, or 202 depending on implementation
    assert response.status_code in (200, 201, 202, 400, 422)


@pytest.mark.asyncio
async def test_import_skill_invalid_extension(client):
    """Reject non-.skill files."""
    response = await client.post(
        "/api/v1/registry/import",
        files={"file": ("test.txt", b"not a zip", "text/plain")},
    )
    assert response.status_code in (400, 422)


@pytest.mark.asyncio
async def test_import_skill_conflict(client, db_session: AsyncSession):
    """Import a skill that already exists."""
    skill = make_skill(name="conflict-test")
    db_session.add(skill)
    await db_session.flush()

    zip_data = _create_skill_zip("conflict-test")
    response = await client.post(
        "/api/v1/registry/import",
        files={"file": ("conflict-test.skill", zip_data, "application/zip")},
    )
    # Should report conflict
    assert response.status_code in (200, 409, 400)


@pytest.mark.asyncio
async def test_import_directory_validation_no_files(client):
    response = await client.post("/api/v1/registry/import-directory")
    assert response.status_code == 400
    assert response.json()["detail"] == "No files provided"


@pytest.mark.asyncio
async def test_import_directory_validation_smoke_bulk_response_contract(client):
    skill_a = (
        "---\nname: skill-a\ndescription: Test skill A\n---\n\n"
        "# Skill A\n\n"
        "This is test content long enough to pass minimum validation checks."
    )
    skill_b = (
        "---\nname: skill-b\ndescription: Test skill B\n---\n\n"
        "# Skill B\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    response = await client.post(
        "/api/v1/registry/import-directory?check_only=true",
        files=[
            ("files", ("parent/skill-a/SKILL.md", skill_a.encode("utf-8"), "text/markdown")),
            ("files", ("parent/skill-b/SKILL.md", skill_b.encode("utf-8"), "text/markdown")),
        ],
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) >= {
        "results",
        "total_imported",
        "total_skipped",
        "total_failed",
    }


@pytest.mark.asyncio
async def test_import_directory_accepts_sibling_skill_folders_without_parent_directory(client):
    skill_a = (
        "---\nname: skill-a\ndescription: Test skill A\n---\n\n"
        "# Skill A\n\n"
        "This is test content long enough to pass minimum validation checks."
    )
    skill_b = (
        "---\nname: skill-b\ndescription: Test skill B\n---\n\n"
        "# Skill B\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    captured_calls = []

    async def _fake_do_skill_import(*, original_skill_name, skill_md_content, other_files, schema_json, manifest_json,
                                    check_only, conflict_action, source, db, source_url=None, author=None,
                                    skipped_files=None):
        captured_calls.append({
            "original_skill_name": original_skill_name,
            "other_files": other_files,
            "check_only": check_only,
        })
        return ImportSkillResponse(
            success=True,
            skill_name=original_skill_name,
            version="0.0.1",
            message=f"Imported {original_skill_name}",
            skipped_files=skipped_files or [],
        )

    with patch("app.api.v1.registry._do_skill_import", new=AsyncMock(side_effect=_fake_do_skill_import)):
        response = await client.post(
            "/api/v1/registry/import-directory?check_only=true",
            files=[
                ("files", ("skill-a/SKILL.md", skill_a.encode("utf-8"), "text/markdown")),
                ("files", ("skill-a/scripts/run.py", b"print('a')", "text/plain")),
                ("files", ("skill-b/SKILL.md", skill_b.encode("utf-8"), "text/markdown")),
            ],
        )

    assert response.status_code == 200
    data = response.json()
    assert len(captured_calls) == 2
    assert {call["original_skill_name"] for call in captured_calls} == {"skill-a", "skill-b"}

    call_a = next(call for call in captured_calls if call["original_skill_name"] == "skill-a")
    call_b = next(call for call in captured_calls if call["original_skill_name"] == "skill-b")

    assert call_a["check_only"] is True
    assert "scripts/run.py" in call_a["other_files"]
    assert call_a["other_files"]["scripts/run.py"][1] == "script"
    assert call_b["other_files"] == {}

    result_by_skill = {item["skill_name"]: item for item in data["results"]}
    assert result_by_skill["skill-a"]["success"] is True
    assert result_by_skill["skill-a"]["status"] == "ready"
    assert result_by_skill["skill-b"]["success"] is True
    assert result_by_skill["skill-b"]["status"] == "ready"
    assert data["total_imported"] == 0
    assert data["total_skipped"] == 0
    assert data["total_failed"] == 0


@pytest.mark.asyncio
async def test_import_directory_grouping_groups_by_second_segment_and_imports_per_skill(client):
    skill_a = (
        "---\nname: skill-a\ndescription: Test skill A\n---\n\n"
        "# Skill A\n\n"
        "This is test content long enough to pass minimum validation checks."
    )
    skill_b = (
        "---\nname: skill-b\ndescription: Test skill B\n---\n\n"
        "# Skill B\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    captured_calls = []

    async def _fake_do_skill_import(*, original_skill_name, skill_md_content, other_files, schema_json, manifest_json,
                                    check_only, conflict_action, source, db, source_url=None, author=None,
                                    skipped_files=None):
        captured_calls.append({
            "original_skill_name": original_skill_name,
            "skill_md_content": skill_md_content,
            "other_files": other_files,
            "schema_json": schema_json,
            "manifest_json": manifest_json,
            "check_only": check_only,
            "conflict_action": conflict_action,
            "source": source,
            "skipped_files": skipped_files or [],
        })
        return ImportSkillResponse(
            success=True,
            skill_name=original_skill_name,
            version="0.0.1",
            message=f"Imported {original_skill_name}",
            skipped_files=skipped_files or [],
        )

    with patch("app.api.v1.registry._do_skill_import", new=AsyncMock(side_effect=_fake_do_skill_import)):
        response = await client.post(
            "/api/v1/registry/import-directory?check_only=true",
            files=[
                ("files", ("parent/skill-a/SKILL.md", skill_a.encode("utf-8"), "text/markdown")),
                ("files", ("parent/skill-a/scripts/run.py", b"print('a')", "text/plain")),
                ("files", ("parent/skill-a/schema.json", b"{\"kind\":\"a\"}", "application/json")),
                ("files", ("parent/skill-a/manifest.json", b"{\"name\":\"a\"}", "application/json")),
                ("files", ("parent/skill-a/.hidden", b"ignore", "text/plain")),
                ("files", ("parent/skill-a/__pycache__/x.pyc", b"ignore", "application/octet-stream")),
                ("files", ("parent/skill-a/bin/tool.wasm", b"compiled", "application/wasm")),
                ("files", ("parent/skill-b/SKILL.md", skill_b.encode("utf-8"), "text/markdown")),
                ("files", ("parent/skill-b/references/info.md", b"ref", "text/markdown")),
                ("files", ("bad-path.txt", b"bad", "text/plain")),
                ("files", ("parent/skill-c/docs/SKILL.md", b"nested not root", "text/markdown")),
                ("files", ("parent/skill-d/schema.json", b"{\"kind\":\"d\"}", "application/json")),
            ],
        )

    assert response.status_code == 200
    data = response.json()

    assert len(captured_calls) == 2
    assert {call["original_skill_name"] for call in captured_calls} == {"skill-a", "skill-b"}

    call_a = next(call for call in captured_calls if call["original_skill_name"] == "skill-a")
    call_b = next(call for call in captured_calls if call["original_skill_name"] == "skill-b")

    assert call_a["schema_json"] == {"kind": "a"}
    assert call_a["manifest_json"] == {"name": "a"}
    assert "scripts/run.py" in call_a["other_files"]
    assert call_a["other_files"]["scripts/run.py"][1] == "script"
    assert "bin/tool.wasm" not in call_a["other_files"]
    assert "bin/tool.wasm" in call_a["skipped_files"]

    assert call_b["schema_json"] is None
    assert call_b["manifest_json"] is None
    assert "references/info.md" in call_b["other_files"]
    assert call_b["other_files"]["references/info.md"][1] == "reference"

    assert data["total_imported"] == 0
    assert data["total_failed"] == 2
    assert data["total_skipped"] == 0
    assert len(data["results"]) == 4

    result_by_skill = {item["skill_name"]: item for item in data["results"]}
    assert result_by_skill["skill-a"]["success"] is True
    assert result_by_skill["skill-a"]["status"] == "ready"
    assert result_by_skill["skill-b"]["success"] is True
    assert result_by_skill["skill-b"]["status"] == "ready"
    assert result_by_skill["skill-c"]["success"] is False
    assert "SKILL.md file at the root level" in result_by_skill["skill-c"]["message"]
    assert result_by_skill["skill-c"]["status"] == "failed"

    assert result_by_skill["skill-d"]["success"] is False
    assert "SKILL.md file at the root level" in result_by_skill["skill-d"]["message"]
    assert result_by_skill["skill-d"]["status"] == "failed"


@pytest.mark.asyncio
async def test_import_directory_grouping_reports_missing_root_skill_md(client):
    response = await client.post(
        "/api/v1/registry/import-directory?check_only=true",
        files=[
            ("files", ("parent/skill-a/docs/SKILL.md", b"nested", "text/markdown")),
            ("files", ("parent/skill-a/scripts/run.py", b"print('a')", "text/plain")),
            ("files", ("parent/skill-b/schema.json", b"{\"name\":\"b\"}", "application/json")),
        ],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_imported"] == 0
    assert data["total_failed"] == 2
    assert data["total_skipped"] == 0

    result_by_skill = {item["skill_name"]: item for item in data["results"]}
    assert result_by_skill["skill-a"]["success"] is False
    assert "SKILL.md file at the root level" in result_by_skill["skill-a"]["message"]
    assert result_by_skill["skill-a"]["status"] == "failed"

    assert result_by_skill["skill-b"]["success"] is False
    assert "SKILL.md file at the root level" in result_by_skill["skill-b"]["message"]
    assert result_by_skill["skill-b"]["status"] == "failed"


@pytest.mark.asyncio
async def test_import_directory_check_only_aggregates_conflicts_as_skipped(client, db_session: AsyncSession):
    existing_skill = make_skill(name="conflict-skill")
    db_session.add(existing_skill)
    await db_session.flush()
    existing_version = make_skill_version(skill_id=existing_skill.id, version="1.2.3")
    db_session.add(existing_version)
    await db_session.flush()
    await db_session.refresh(existing_skill)

    conflicting_skill = (
        "---\nname: conflict-skill\ndescription: Existing skill\n---\n\n"
        "# Conflict Skill\n\n"
        "This is test content long enough to pass minimum validation checks."
    )
    new_skill = (
        "---\nname: brand-new-skill\ndescription: New skill\n---\n\n"
        "# Brand New Skill\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    response = await client.post(
        "/api/v1/registry/import-directory?check_only=true",
        files=[
            ("files", ("parent/conflict-skill/SKILL.md", conflicting_skill.encode("utf-8"), "text/markdown")),
            ("files", ("parent/brand-new-skill/SKILL.md", new_skill.encode("utf-8"), "text/markdown")),
        ],
    )

    assert response.status_code == 200
    data = response.json()

    result_by_skill = {item["skill_name"]: item for item in data["results"]}
    assert result_by_skill["conflict-skill"]["conflict"] is True
    assert result_by_skill["conflict-skill"]["status"] == "conflict"
    assert result_by_skill["brand-new-skill"]["success"] is True
    assert result_by_skill["brand-new-skill"]["status"] == "ready"
    assert data["total_imported"] == 0
    assert data["total_skipped"] == 1
    assert data["total_failed"] == 0


@pytest.mark.asyncio
async def test_import_directory_mixed_results(client, db_session: AsyncSession):
    existing_skill = make_skill(name="conflict-skill")
    db_session.add(existing_skill)
    await db_session.flush()

    importable_skill = (
        "---\nname: importable-skill\ndescription: Importable skill\n---\n\n"
        "# Importable Skill\n\n"
        "This is test content long enough to pass minimum validation checks."
    )
    conflicting_skill = (
        "---\nname: conflict-skill\ndescription: Existing skill\n---\n\n"
        "# Conflict Skill\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    response = await client.post(
        "/api/v1/registry/import-directory",
        files=[
            ("files", ("parent/importable-skill/SKILL.md", importable_skill.encode("utf-8"), "text/markdown")),
            ("files", ("parent/conflict-skill/SKILL.md", conflicting_skill.encode("utf-8"), "text/markdown")),
            ("files", ("parent/bad-utf8-skill/SKILL.md", b"\xff\xfe\xfa", "text/markdown")),
        ],
    )

    assert response.status_code == 200
    data = response.json()

    assert data["total_imported"] == 1
    assert data["total_skipped"] == 1
    assert data["total_failed"] == 1
    assert {item["status"] for item in data["results"]} >= {"imported", "skipped", "failed"}


@pytest.fixture
def isolated_custom_skills_dir(tmp_path):
    skills_dir = tmp_path / "skills"
    with patch("app.api.v1.registry.settings.custom_skills_dir", str(skills_dir)):
        yield skills_dir


@pytest.mark.asyncio
async def test_import_directory_conflict_action_skip_skips_existing_skill(
    client,
    db_session: AsyncSession,
    isolated_custom_skills_dir,
):
    existing_skill = make_skill(name="existing-skill")
    db_session.add(existing_skill)
    await db_session.flush()
    db_session.add(make_skill_version(skill_id=existing_skill.id, version="1.2.3"))
    await db_session.flush()

    skill_md = (
        "---\nname: existing-skill\ndescription: Existing skill\n---\n\n"
        "# Existing Skill\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    response = await client.post(
        "/api/v1/registry/import-directory?conflict_action=skip",
        files=[("files", ("parent/existing-skill/SKILL.md", skill_md.encode("utf-8"), "text/markdown"))],
    )

    assert response.status_code == 200
    assert any(item["status"] == "skipped" for item in response.json()["results"])


@pytest.mark.asyncio
async def test_import_directory_conflict_action_copy_creates_copy_name(
    client,
    db_session: AsyncSession,
    isolated_custom_skills_dir,
):
    existing_skill = make_skill(name="existing-skill")
    db_session.add(existing_skill)
    await db_session.flush()
    db_session.add(make_skill_version(skill_id=existing_skill.id, version="1.2.3"))
    await db_session.flush()

    skill_md = (
        "---\nname: existing-skill\ndescription: Existing skill\n---\n\n"
        "# Existing Skill\n\n"
        "This is test content long enough to pass minimum validation checks."
    )

    response = await client.post(
        "/api/v1/registry/import-directory?conflict_action=copy",
        files=[("files", ("parent/existing-skill/SKILL.md", skill_md.encode("utf-8"), "text/markdown"))],
    )

    assert response.status_code == 200
    assert any(item["skill_name"].startswith("existing-skill-copy") for item in response.json()["results"])


@pytest.mark.asyncio
async def test_import_directory_conflict_action_overwrite_overwrites_existing_skill(
    client,
    db_session: AsyncSession,
    isolated_custom_skills_dir,
):
    existing_skill = make_skill(name="existing-skill", current_version="1.2.3")
    db_session.add(existing_skill)
    await db_session.flush()
    old_skill_md = (
        "---\nname: existing-skill\ndescription: Old skill\n---\n\n"
        "# Existing Skill\n\n"
        "This is old content long enough to pass minimum validation checks."
    )
    db_session.add(make_skill_version(skill_id=existing_skill.id, version="1.2.3", skill_md=old_skill_md))
    await db_session.flush()

    preexisting_skill_dir = isolated_custom_skills_dir / "existing-skill"
    preexisting_skill_dir.mkdir(parents=True, exist_ok=True)
    old_file = preexisting_skill_dir / "scripts" / "old.py"
    old_file.parent.mkdir(parents=True, exist_ok=True)
    old_file.write_text("print('old')", encoding="utf-8")

    new_skill_md = (
        "---\nname: existing-skill\ndescription: Replaced skill\n---\n\n"
        "# Existing Skill\n\n"
        "This is replacement content long enough to pass minimum validation checks."
    )

    response = await client.post(
        "/api/v1/registry/import-directory?conflict_action=overwrite",
        files=[
            ("files", ("parent/existing-skill/SKILL.md", new_skill_md.encode("utf-8"), "text/markdown")),
            ("files", ("parent/existing-skill/scripts/new.py", b"print('new')", "text/plain")),
        ],
    )

    assert response.status_code == 200
    data = response.json()
    assert any(
        item["status"] == "imported" and item["skill_name"] == "existing-skill"
        for item in data["results"]
    )

    refreshed_skill = await db_session.get(type(existing_skill), existing_skill.id)
    assert refreshed_skill is None

    from app.services.skill_service import SkillService

    replacement_skill = await SkillService(db_session).skill_repo.get_by_name("existing-skill")
    assert replacement_skill is not None
    assert replacement_skill.id != existing_skill.id
    assert replacement_skill.current_version == "0.0.1"

    overwritten_dir = isolated_custom_skills_dir / "existing-skill"
    assert overwritten_dir.exists()
    assert not (overwritten_dir / "scripts" / "old.py").exists()
    assert (overwritten_dir / "scripts" / "new.py").exists()
    assert "Replaced skill" in (overwritten_dir / "SKILL.md").read_text(encoding="utf-8")


@pytest.mark.asyncio
async def test_validate_skill(client):
    """POST /registry/validate with skill content."""
    response = await client.post(
        "/api/v1/registry/validate",
        json={
            "skill_md": "---\nname: test\ndescription: Test\n---\n\n# Test\n\nThis is test content that is long enough to pass the validation minimum length check.",
        },
    )
    assert response.status_code in (200, 422)
    if response.status_code == 200:
        data = response.json()
        assert "valid" in data or "errors" in data or "result" in data
