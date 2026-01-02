"""Add layers table

Revision ID: e3d11425572b
Revises: 18b6048e9966
Create Date: 2026-01-01 19:09:48.117274

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3d11425572b'
down_revision: Union[str, Sequence[str], None] = '18b6048e9966'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add the layers table
    op.create_table(
        'layers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),  # e.g., "image", "text"
        sa.Column('content', sa.Text(), nullable=True),  # File path or text content
        sa.Column('z_index', sa.Integer(), nullable=True),  # Order in the stack
        sa.Column('locked', sa.Boolean(), nullable=True),
        sa.Column('opacity', sa.Integer(), nullable=True),  # Transparency (0-100)
        sa.Column('visible', sa.Boolean(), nullable=True),  # Hidden or visible
        sa.Column('x', sa.Float(), nullable=True),  # X position on the canvas
        sa.Column('y', sa.Float(), nullable=True),  # Y position
        sa.Column('width', sa.Float(), nullable=True),  # Width of the layer
        sa.Column('height', sa.Float(), nullable=True),  # Height of the layer
        sa.Column('blend_mode', sa.String(), nullable=True),  # Blending mode
        sa.Column('created_at', sa.DateTime(), nullable=True),  # Creation timestamp
        sa.Column('updated_at', sa.DateTime(), nullable=True),  # Last updated time
        sa.PrimaryKeyConstraint('id')  # Mark "id" as the primary key
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the layers table if we downgrade
    op.drop_table('layers')