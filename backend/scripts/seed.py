import asyncio

from passlib.context import CryptContext

from app.db.session import SessionLocal
from app.models import User, Service

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_SERVICES = [
    ("Corte", 30, 40.00),
    ("Barba", 20, 25.00),
    ("Corte + Barba", 50, 60.00),
    ("Sobrancelha", 10, 15.00),
]


async def seed() -> None:
    async with SessionLocal() as session:
        admin_email = input("E-mail do funcionário inicial: ").strip()
        admin_name = input("Nome do funcionário inicial: ").strip()
        admin_password = input("Senha do funcionário inicial: ").strip()

        user = User(
            name=admin_name,
            email=admin_email,
            password_hash=pwd_context.hash(admin_password),
        )
        session.add(user)

        for name, duration, price in DEFAULT_SERVICES:
            session.add(Service(name=name, duration_minutes=duration, price=price))

        await session.commit()
        print(f"Usuário {admin_email} e {len(DEFAULT_SERVICES)} serviços criados.")


if __name__ == "__main__":
    asyncio.run(seed())
