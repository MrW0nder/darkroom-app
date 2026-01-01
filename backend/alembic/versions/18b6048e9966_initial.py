"""initial

Revision ID: 18b6048e9966
Revises: 
Create Date: 2025-12-31 21:50:44.571903

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18b6048e9966'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the images table to align the actual DB schema with models
    op.create_table(
        'images',
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('filename', sa.VARCHAR(), nullable=False),
        sa.Column('filepath', sa.VARCHAR(), nullable=False),
        sa.Column('width', sa.INTEGER(), nullable=True),
        sa.Column('height', sa.INTEGER(), nullable=True),
        sa.Column('format', sa.VARCHAR(length=50), nullable=True),
        sa.Column('metadata', sa.TEXT(), nullable=True),
        sa.Column('created_at', sa.DATETIME(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the images table
    op.drop_table('images')