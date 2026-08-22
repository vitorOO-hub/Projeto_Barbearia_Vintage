"""add partial unique index on active appointment slots

Revision ID: 5610d34b8068
Revises: 8c39497d9bd8
Create Date: 2026-08-22 15:30:18.235409

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5610d34b8068'
down_revision: Union[str, None] = '8c39497d9bd8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "uq_appointments_active_slot",
        "appointments",
        ["appointment_date", "appointment_time"],
        unique=True,
        postgresql_where=sa.text("status IN ('agendado', 'concluido')"),
    )


def downgrade() -> None:
    op.drop_index("uq_appointments_active_slot", table_name="appointments")
