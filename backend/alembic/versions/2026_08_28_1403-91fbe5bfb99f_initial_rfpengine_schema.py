"""initial_rfpengine_schema

Revision ID: 91fbe5bfb99f
Revises: 
Create Date: 2026-08-28 14:03:10.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91fbe5bfb99f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create kb_entries
    op.create_table(
        'kb_entries',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=128), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        if_not_exists=True,
    )
    op.create_index('ix_kb_entries_tenant_id', 'kb_entries', ['tenant_id'], if_not_exists=True)
    op.create_index('ix_kb_entries_category', 'kb_entries', ['category'], if_not_exists=True)
    op.create_index('ix_kb_tenant_category', 'kb_entries', ['tenant_id', 'category'], if_not_exists=True)

    # 2. Create response_workspaces
    op.create_table(
        'response_workspaces',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('source_mode', sa.String(length=32), nullable=False),
        sa.Column('source_url', sa.String(length=1024), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        if_not_exists=True,
    )
    op.create_index('ix_response_workspaces_tenant_id', 'response_workspaces', ['tenant_id'], if_not_exists=True)

    # 3. Create question_reviews
    op.create_table(
        'question_reviews',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('workspace_id', sa.String(length=64), nullable=False),
        sa.Column('question_index', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('suggested_answer', sa.Text(), nullable=True),
        sa.Column('final_answer', sa.Text(), nullable=True),
        sa.Column('review_status', sa.String(length=64), nullable=False),
        sa.Column('assigned_role', sa.String(length=64), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('sources_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['response_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        if_not_exists=True,
    )
    op.create_index('ix_question_reviews_workspace_id', 'question_reviews', ['workspace_id'], if_not_exists=True)
    op.create_index('ix_workspace_question_idx', 'question_reviews', ['workspace_id', 'question_index'], unique=True, if_not_exists=True)


def downgrade() -> None:
    op.drop_index('ix_workspace_question_idx', table_name='question_reviews', if_exists=True)
    op.drop_index('ix_question_reviews_workspace_id', table_name='question_reviews', if_exists=True)
    op.drop_table('question_reviews', if_exists=True)
    op.drop_index('ix_response_workspaces_tenant_id', table_name='response_workspaces', if_exists=True)
    op.drop_table('response_workspaces', if_exists=True)
    op.drop_index('ix_kb_tenant_category', table_name='kb_entries', if_exists=True)
    op.drop_index('ix_kb_entries_category', table_name='kb_entries', if_exists=True)
    op.drop_index('ix_kb_entries_tenant_id', table_name='kb_entries', if_exists=True)
    op.drop_table('kb_entries', if_exists=True)
