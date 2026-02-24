"""add cover crop fields to projects

Revision ID: c3f1b2d4e5f6
Revises: b1c3f8c7d2a1
Create Date: 2026-02-18
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c3f1b2d4e5f6"
down_revision = "b1c3f8c7d2a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("cover_original_width", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("cover_original_height", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("cover_crop_x", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("cover_crop_y", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("cover_crop_width", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("cover_crop_height", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "cover_crop_height")
    op.drop_column("projects", "cover_crop_width")
    op.drop_column("projects", "cover_crop_y")
    op.drop_column("projects", "cover_crop_x")
    op.drop_column("projects", "cover_original_height")
    op.drop_column("projects", "cover_original_width")
