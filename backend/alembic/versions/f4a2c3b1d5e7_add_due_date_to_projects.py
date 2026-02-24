"""Add due_date column to projects table

Revision ID: f4a2c3b1d5e7
Revises: e3d11425572b
Create Date: 2026-02-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a2c3b1d5e7'
down_revision: Union[str, Sequence[str], None] = 'e3d11425572b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add the due_date column to projects table
    op.add_column('projects', sa.Column('due_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the due_date column if we downgrade
    op.drop_column('projects', 'due_date')
