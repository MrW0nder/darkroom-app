"""add cover_image to projects

Revision ID: b1c3f8c7d2a1
Revises: a3944f10e403
Create Date: 2026-02-18
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b1c3f8c7d2a1"
down_revision = "a3944f10e403"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("cover_image", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "cover_image")
