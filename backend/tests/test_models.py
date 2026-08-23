from datetime import date, time

import pytest
from sqlalchemy import select

from app.models import Client, Service, Barber, Appointment, AppointmentStatus


@pytest.mark.anyio
async def test_create_client_and_service_and_appointment(db_session):
    client = Client(name="João Silva", email="joao@example.com")
    service = Service(name="Corte", duration_minutes=30, price=40)
    barber = Barber(name="Carlos Silva")
    db_session.add_all([client, service, barber])
    await db_session.commit()
    await db_session.refresh(client)
    await db_session.refresh(service)
    await db_session.refresh(barber)

    appt = Appointment(
        client_id=client.id,
        service_id=service.id,
        barber_id=barber.id,
        appointment_date=date.fromisoformat("2026-08-25"),
        appointment_time=time.fromisoformat("14:00"),
        status=AppointmentStatus.agendado,
    )
    db_session.add(appt)
    await db_session.commit()

    result = await db_session.execute(select(Appointment))
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].status == AppointmentStatus.agendado


@pytest.mark.anyio
async def test_client_active_defaults_true(db_session):
    client = Client(name="Maria")
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    assert client.active is True
