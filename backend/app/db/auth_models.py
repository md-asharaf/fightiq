from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "user"
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    emailVerified: Mapped[bool] = mapped_column(Boolean, nullable=False)  # noqa: N815
    image: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    banned: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    banReason: Mapped[str | None] = mapped_column(Text, nullable=True)  # noqa: N815
    banExpires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # noqa: N815
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815

    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "session"
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    userId: Mapped[str] = mapped_column(String(255), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)  # noqa: N815
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    expiresAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815
    ipAddress: Mapped[str | None] = mapped_column(Text, nullable=True)  # noqa: N815
    userAgent: Mapped[str | None] = mapped_column(Text, nullable=True)  # noqa: N815
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815

    user: Mapped[User] = relationship("User", back_populates="sessions")


class Account(Base):
    __tablename__ = "account"
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    userId: Mapped[str] = mapped_column(String(255), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)  # noqa: N815
    accountId: Mapped[str] = mapped_column(String(255), nullable=False)  # noqa: N815
    providerId: Mapped[str] = mapped_column(String(255), nullable=False)  # noqa: N815
    accessToken: Mapped[str | None] = mapped_column(Text, nullable=True)  # noqa: N815
    refreshToken: Mapped[str | None] = mapped_column(Text, nullable=True)  # noqa: N815
    expiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # noqa: N815
    password: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815

    user: Mapped[User] = relationship("User", back_populates="accounts")


class Verification(Base):
    __tablename__ = "verification"
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    identifier: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    expiresAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # noqa: N815
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # noqa: N815
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # noqa: N815
