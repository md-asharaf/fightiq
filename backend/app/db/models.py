from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Document(Base):
    """Represents an ingested UFC knowledge document.
    Each Document is the source for one or more Chunks.
    """

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    source: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    chunks: Mapped[list[Chunk]] = relationship(
        "Chunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class Chunk(Base):
    """A text chunk derived from a Document, stored with its vector embedding.
    The embedding column uses pgvector for cosine similarity search.
    """

    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(768),
        nullable=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    document: Mapped[Document] = relationship("Document", back_populates="chunks")


class QuizSession(Base):
    """A generated quiz session with its questions."""

    __tablename__ = "quiz_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str | None] = mapped_column(
        String(255), ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True
    )
    topic: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    difficulty: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="medium",
    )
    num_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    questions: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    results: Mapped[list[QuizResult]] = relationship(
        "QuizResult",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class QuizResult(Base):
    """Submitted quiz answers and computed score."""

    __tablename__ = "quiz_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session: Mapped[QuizSession] = relationship("QuizSession", back_populates="results")


class ChatSession(Base):
    """A chat session containing multiple messages."""

    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str | None] = mapped_column(
        String(255), ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    share_id: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)

    messages: Mapped[list[ChatMessage]] = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    """A single message within a chat session."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[list[dict]] = mapped_column(JSONB, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session: Mapped[ChatSession] = relationship("ChatSession", back_populates="messages")


class EvalRun(Base):
    """An evaluation run with multiple question results."""

    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_name: Mapped[str] = mapped_column(String(200), nullable=False)
    overall_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    question_results: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class SemanticToolCache(Base):
    """Caches tool responses (e.g. web searches) based on semantic similarity."""

    __tablename__ = "semantic_tool_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    query_embedding: Mapped[list[float]] = mapped_column(
        Vector(768),
        nullable=False,
    )
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    result_payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Fighter(Base):
    """Structured data about a UFC Fighter extracted from web searches."""

    __tablename__ = "fighters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    division: Mapped[str | None] = mapped_column(String(100), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    weight_class: Mapped[str | None] = mapped_column(String(255), nullable=True)
    record: Mapped[str | None] = mapped_column(String(100), nullable=True)
    wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    losses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    draws: Mapped[int | None] = mapped_column(Integer, nullable=True)
    no_contests: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ko_wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    submission_wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    decision_wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_ranking: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_champion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active_status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    title_defenses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    championships: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    win_streak: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stance: Mapped[str | None] = mapped_column(String(50), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    reach_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    slpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    str_acc: Mapped[float | None] = mapped_column(Float, nullable=True)
    sapm: Mapped[float | None] = mapped_column(Float, nullable=True)
    str_def: Mapped[float | None] = mapped_column(Float, nullable=True)
    td_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    td_acc: Mapped[float | None] = mapped_column(Float, nullable=True)
    td_def: Mapped[float | None] = mapped_column(Float, nullable=True)
    sub_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    profile_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    data_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Event(Base):
    """Structured data about a UFC Event extracted from web searches."""

    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    venue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    promotion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    main_event: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    data_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class Fight(Base):
    """Structured data about a MMA Fight."""

    __tablename__ = "fights"
    __table_args__ = (UniqueConstraint("event_id", "fighter_a_id", "fighter_b_id", name="uix_fight_event_fighters"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=True, index=True)
    fighter_a_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fighters.id", ondelete="SET NULL"), nullable=True, index=True)
    fighter_b_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fighters.id", ondelete="SET NULL"), nullable=True, index=True)
    winner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fighters.id", ondelete="SET NULL"), nullable=True)
    weight_class: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result: Mapped[str | None] = mapped_column(String(100), nullable=True)
    method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    round: Mapped[str | None] = mapped_column(String(50), nullable=True)
    time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referee: Mapped[str | None] = mapped_column(String(100), nullable=True)
    judge_scorecards: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    bonus: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title_fight: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    data_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class Ranking(Base):
    """Structured data about MMA Rankings."""

    __tablename__ = "rankings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promotion: Mapped[str | None] = mapped_column(String(100), nullable=True, default="UFC")
    division: Mapped[str] = mapped_column(String(100), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    fighter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fighters.id", ondelete="CASCADE"), nullable=True, index=True)
    ranking_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    data_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class EventFightCard(Base):
    """Tracks bout order and card type for fights within an event."""

    __tablename__ = "event_fight_cards"
    __table_args__ = (UniqueConstraint("event_id", "fight_id", name="uix_event_fight"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    fight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fights.id", ondelete="CASCADE"), nullable=False, index=True)
    card_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bout_order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class WeightClass(Base):
    """Structured weight class limits and definitions."""

    __tablename__ = "weight_classes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promotion: Mapped[str] = mapped_column(String(100), nullable=False)
    division: Mapped[str] = mapped_column(String(100), nullable=False)
    minimum_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    maximum_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), default="lbs")

    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


from app.db.auth_models import Account, Session, User, Verification  # noqa: E402, F401
