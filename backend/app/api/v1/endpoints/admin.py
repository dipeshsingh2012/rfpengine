from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import copy

router = APIRouter()

# Data models
class RoleCreatePayload(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    icon: str = Field(default="👤", max_length=10)
    description: str = Field(default="", max_length=200)
    workflow_type: str = Field(default="sequential") # "sequential" | "parallel" | "ad_hoc"
    step_order: Optional[int] = Field(default=5)
    routing_tag: Optional[str] = None
    permissions: Dict[str, bool] = Field(default_factory=dict)

class RoleUpdatePayload(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    workflow_type: Optional[str] = None
    step_order: Optional[int] = None
    routing_tag: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None

class MemberRoleUpdatePayload(BaseModel):
    role: str

class GovernanceSettingsPayload(BaseModel):
    workflow_mode: str = Field(default="waterfall") # "waterfall" | "parallel" | "hybrid"
    security_sme_email: Optional[str] = None
    legal_reviewer_email: Optional[str] = None
    finance_sme_email: Optional[str] = None
    auto_promote_golden_qa: bool = True
    continuous_learning_enabled: bool = True
    allowed_domains: str = "acme-corp.com"
    session_timeout_minutes: int = 120

# In-memory tenant stores
DEFAULT_ROLES: List[Dict[str, Any]] = [
    {
        "id": "Proposal manager",
        "name": "Proposal Drafter",
        "icon": "🧑‍💻",
        "description": "Drafts responses, imports questionnaires, generates AI answers",
        "workflow_type": "sequential",
        "step_order": 1,
        "is_builtin": True,
        "routing_tag": "#Draft",
        "permissions": {
            "create_questionnaire": True,
            "edit_drafts": True,
            "generate_ai": True,
            "advance_stage": True,
            "view_kb": True,
            "upload_kb": True,
            "manage_roles": False,
            "data_reset": False,
        },
    },
    {
        "id": "Security SME",
        "name": "Security SME",
        "icon": "🛡️",
        "description": "Audits compliance, approves security sections, manages certs",
        "workflow_type": "sequential",
        "step_order": 2,
        "is_builtin": True,
        "routing_tag": "#Security",
        "permissions": {
            "create_questionnaire": False,
            "edit_drafts": True,
            "generate_ai": True,
            "advance_stage": True,
            "view_kb": True,
            "upload_kb": True,
            "manage_roles": False,
            "data_reset": False,
        },
    },
    {
        "id": "Legal reviewer",
        "name": "Legal Reviewer",
        "icon": "⚖️",
        "description": "Reviews liability, indemnification, and contractual terms",
        "workflow_type": "sequential",
        "step_order": 3,
        "is_builtin": True,
        "routing_tag": "#Legal",
        "permissions": {
            "create_questionnaire": False,
            "edit_drafts": True,
            "generate_ai": False,
            "advance_stage": True,
            "view_kb": True,
            "upload_kb": False,
            "manage_roles": False,
            "data_reset": False,
        },
    },
    {
        "id": "Final approver",
        "name": "Final Approver",
        "icon": "👑",
        "description": "Executive sign-off authority, exports deliverables, signs off",
        "workflow_type": "sequential",
        "step_order": 4,
        "is_builtin": True,
        "routing_tag": "#Executive",
        "permissions": {
            "create_questionnaire": True,
            "edit_drafts": True,
            "generate_ai": True,
            "advance_stage": True,
            "view_kb": True,
            "upload_kb": True,
            "manage_roles": True,
            "data_reset": True,
        },
    },
]

DEFAULT_MEMBERS: List[Dict[str, Any]] = [
    {
        "id": "mem-1",
        "name": "Alex Chen",
        "email": "alex.chen@acme-corp.com",
        "picture": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        "role": "Proposal manager",
        "is_google_sso": True,
        "last_active": "Just now",
        "tenant_id": "acme-corp",
    },
    {
        "id": "mem-2",
        "name": "Marcus Vance",
        "email": "marcus.vance@acme-corp.com",
        "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        "role": "Security SME",
        "is_google_sso": True,
        "last_active": "2 hours ago",
        "tenant_id": "acme-corp",
    },
    {
        "id": "mem-3",
        "name": "Elena Rostova",
        "email": "elena.rostova@acme-corp.com",
        "picture": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
        "role": "Legal reviewer",
        "is_google_sso": True,
        "last_active": "Yesterday",
        "tenant_id": "acme-corp",
    },
    {
        "id": "mem-4",
        "name": "David Sterling",
        "email": "david.sterling@acme-corp.com",
        "picture": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
        "role": "Final approver",
        "is_google_sso": True,
        "last_active": "3 days ago",
        "tenant_id": "acme-corp",
    },
]

DEFAULT_GOVERNANCE = {
    "workflow_mode": "waterfall",
    "security_sme_email": "infosec@acme-corp.com",
    "legal_reviewer_email": "legal-review@acme-corp.com",
    "finance_sme_email": "pricing@acme-corp.com",
    "auto_promote_golden_qa": True,
    "continuous_learning_enabled": True,
    "allowed_domains": "acme-corp.com",
    "session_timeout_minutes": 120,
}

_tenant_roles: Dict[str, List[Dict[str, Any]]] = {}
_tenant_members: Dict[str, List[Dict[str, Any]]] = {}
_tenant_governance: Dict[str, Dict[str, Any]] = {}

def get_tenant_roles(tenant_id: str) -> List[Dict[str, Any]]:
    if tenant_id not in _tenant_roles:
        _tenant_roles[tenant_id] = copy.deepcopy(DEFAULT_ROLES)
    return _tenant_roles[tenant_id]

def get_tenant_members(tenant_id: str) -> List[Dict[str, Any]]:
    if tenant_id not in _tenant_members:
        _tenant_members[tenant_id] = copy.deepcopy(DEFAULT_MEMBERS)
    return _tenant_members[tenant_id]

def get_tenant_governance(tenant_id: str) -> Dict[str, Any]:
    if tenant_id not in _tenant_governance:
        _tenant_governance[tenant_id] = copy.deepcopy(DEFAULT_GOVERNANCE)
    return _tenant_governance[tenant_id]

# Auto-discovery registration called from auth endpoint or client
def register_member_discovery(tenant_id: str, member: Dict[str, Any]):
    members = get_tenant_members(tenant_id)
    existing = next((m for m in members if m["email"].lower() == member["email"].lower()), None)
    if existing:
        existing["name"] = member.get("name") or existing["name"]
        existing["picture"] = member.get("picture") or existing["picture"]
        existing["last_active"] = "Just now"
        existing["is_google_sso"] = True
    else:
        new_mem = {
            "id": f"mem-{len(members) + 1}",
            "name": member.get("name", "New Member"),
            "email": member["email"],
            "picture": member.get("picture", ""),
            "role": "Proposal manager",
            "is_google_sso": True,
            "last_active": "Just now",
            "tenant_id": tenant_id,
        }
        members.insert(0, new_mem)

# --- Role Endpoints ---

@router.get("/roles")
async def list_roles(x_tenant_id: Optional[str] = Header("acme-corp")):
    """List all available roles (built-in and custom) for the tenant."""
    roles = get_tenant_roles(x_tenant_id)
    return {"roles": roles, "total": len(roles)}

@router.post("/roles", status_code=status.HTTP_201_CREATED)
async def create_custom_role(payload: RoleCreatePayload, x_tenant_id: Optional[str] = Header("acme-corp")):
    """Create a new custom role with workflow positioning and granular permissions."""
    roles = get_tenant_roles(x_tenant_id)
    role_id = payload.name.strip()
    if any(r["id"].lower() == role_id.lower() or r["name"].lower() == payload.name.lower() for r in roles):
        raise HTTPException(status_code=400, detail=f"A role named '{payload.name}' already exists")

    new_role = {
        "id": role_id,
        "name": payload.name,
        "icon": payload.icon,
        "description": payload.description,
        "workflow_type": payload.workflow_type,
        "step_order": payload.step_order or (len(roles) + 1),
        "is_builtin": False,
        "routing_tag": payload.routing_tag or f"#{payload.name.replace(' ', '')}",
        "permissions": payload.permissions,
    }
    roles.append(new_role)
    return {"status": "created", "role": new_role}

@router.put("/roles/{role_id}")
async def update_role(role_id: str, payload: RoleUpdatePayload, x_tenant_id: Optional[str] = Header("acme-corp")):
    """Update custom role configuration or permissions."""
    roles = get_tenant_roles(x_tenant_id)
    role = next((r for r in roles if r["id"] == role_id), None)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if payload.name is not None:
        role["name"] = payload.name
    if payload.icon is not None:
        role["icon"] = payload.icon
    if payload.description is not None:
        role["description"] = payload.description
    if payload.workflow_type is not None:
        role["workflow_type"] = payload.workflow_type
    if payload.step_order is not None:
        role["step_order"] = payload.step_order
    if payload.routing_tag is not None:
        role["routing_tag"] = payload.routing_tag
    if payload.permissions is not None:
        role["permissions"] = {**role.get("permissions", {}), **payload.permissions}

    return {"status": "updated", "role": role}

@router.delete("/roles/{role_id}")
async def delete_custom_role(role_id: str, x_tenant_id: Optional[str] = Header("acme-corp")):
    """Deletes a custom role. Built-in system roles cannot be deleted."""
    roles = get_tenant_roles(x_tenant_id)
    role = next((r for r in roles if r["id"] == role_id), None)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("is_builtin"):
        raise HTTPException(status_code=400, detail="Built-in system roles cannot be deleted")

    _tenant_roles[x_tenant_id] = [r for r in roles if r["id"] != role_id]
    return {"status": "deleted", "role_id": role_id}

# --- Member Endpoints ---

@router.get("/members")
async def list_members(x_tenant_id: Optional[str] = Header("acme-corp")):
    """Returns the auto-discovered team members enrolled for the tenant."""
    members = get_tenant_members(x_tenant_id)
    return {"members": members, "total": len(members)}

@router.put("/members/{member_id}/role")
async def reassign_member_role(member_id: str, payload: MemberRoleUpdatePayload, x_tenant_id: Optional[str] = Header("acme-corp")):
    """Assign or reassign a member's role."""
    members = get_tenant_members(x_tenant_id)
    member = next((m for m in members if m["id"] == member_id), None)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    roles = get_tenant_roles(x_tenant_id)
    if not any(r["id"] == payload.role or r["name"] == payload.role for r in roles):
        raise HTTPException(status_code=400, detail=f"Role '{payload.role}' does not exist")

    member["role"] = payload.role
    return {"status": "updated", "member": member}

# --- Governance & Workflow Endpoints ---

@router.get("/governance")
async def get_governance_settings(x_tenant_id: Optional[str] = Header("acme-corp")):
    """Returns tenant-level workflow and governance policies."""
    return get_tenant_governance(x_tenant_id)

@router.put("/governance")
async def update_governance_settings(payload: GovernanceSettingsPayload, x_tenant_id: Optional[str] = Header("acme-corp")):
    """Update tenant workflow mode (waterfall, parallel, hybrid) and governance routing."""
    gov = get_tenant_governance(x_tenant_id)
    gov.update(payload.model_dump())
    return {"status": "updated", "governance": gov}

