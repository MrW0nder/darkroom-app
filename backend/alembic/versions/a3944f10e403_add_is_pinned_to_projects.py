"""add_is_pinned_to_projects

Revision ID: a3944f10e403
Revises: f4a2c3b1d5e7
Create Date: 2026-02-18 14:53:56.797205

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3944f10e403'
down_revision: Union[str, Sequence[str], None] = 'f4a2c3b1d5e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_pinned column to projects table
    op.add_column('projects', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    # Remove is_pinned column from projects table
    op.drop_column('projects', 'is_pinned')
