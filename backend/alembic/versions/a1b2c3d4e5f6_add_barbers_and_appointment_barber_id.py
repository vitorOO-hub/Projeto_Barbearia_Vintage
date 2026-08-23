"""add barbers table and appointment barber_id

Revision ID: a1b2c3d4e5f6
Revises: 5610d34b8068
Create Date: 2026-08-22 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5610d34b8068'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BARBER_NAMES = ["Carlos Silva", "João Pereira", "Marcos Souza"]


def upgrade() -> None:
    op.create_table(
        "barbers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    barbers_table = sa.table("barbers", sa.column("id", sa.Uuid()), sa.column("name", sa.String()))
    barber_ids = [uuid.uuid4() for _ in BARBER_NAMES]
    op.bulk_insert(
        barbers_table,
        [{"id": bid, "name": name} for bid, name in zip(barber_ids, BARBER_NAMES)],
    )
    first_barber_id = barber_ids[0]

    op.add_column("appointments", sa.Column("barber_id", sa.Uuid(), nullable=True))
    op.execute(
        sa.text("UPDATE appointments SET barber_id = :barber_id WHERE barber_id IS NULL").bindparams(
            barber_id=first_barber_id
        )
    )
    op.alter_column("appointments", "barber_id", nullable=False)
    op.create_foreign_key(
        "fk_appointments_barber_id_barbers",
        "appointments",
        "barbers",
        ["barber_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_index("uq_appointments_active_slot", table_name="appointments")
    op.create_index(
        "uq_appointments_active_slot",
        "appointments",
        ["appointment_date", "appointment_time", "barber_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('agendado', 'concluido')"),
    )


def downgrade() -> None:
    op.drop_index("uq_appointments_active_slot", table_name="appointments")
    op.create_index(
        "uq_appointments_active_slot",
        "appointments",
        ["appointment_date", "appointment_time"],
        unique=True,
        postgresql_where=sa.text("status IN ('agendado', 'concluido')"),
    )
    op.drop_constraint("fk_appointments_barber_id_barbers", "appointments", type_="foreignkey")
    op.drop_column("appointments", "barber_id")
    op.drop_table("barbers")
