from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.quiz import QuizGeneratedData
from app.utils.embedder import Embedder
from app.utils.retriever import UFCRetriever

QUIZ_SYSTEM_PROMPT = """You are FightIQ, an expert MMA quiz generator.
Your task is to generate a {difficulty} difficulty multiple-choice quiz about "{topic}".
You MUST base your questions ONLY on the provided context documents.

Requirements:
1. Generate exactly {num_questions} questions.
2. Each question must have exactly 4 options.
3. Each question must have exactly 1 correct option.
4. The options should be plausible to make the quiz challenging.
5. Provide a detailed explanation for why the correct answer is right.
6. The 'sources' field must contain the titles of the documents used to create the question.

Context:
{context}
"""

QUIZ_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", QUIZ_SYSTEM_PROMPT),
        ("user", "Please generate the quiz now in the requested structured format."),
    ],
)


async def generate_quiz(
    session: AsyncSession,
    embedder: Embedder,
    llm: BaseChatModel,
    topic: str,
    difficulty: str,
    num_questions: int,
    category: str | None = None,
    fighter: str | None = None,
) -> QuizGeneratedData:
    """Retrieve relevant documents for the topic, then generate a structured quiz.
    """
    retriever = UFCRetriever(
        session=session,
        embedder=embedder,
        category=category,
        fighter=fighter,
        k=10,
    )
    docs = await retriever.ainvoke(topic)

    context_str = "\n\n".join(
        f"Document Title: {doc.metadata.get('title', 'Unknown')}\n{doc.page_content}"
        for doc in docs
    )

    structured_llm = llm.with_structured_output(QuizGeneratedData)
    chain = QUIZ_PROMPT | structured_llm

    result = await chain.ainvoke(
        {
            "topic": topic,
            "difficulty": difficulty,
            "num_questions": num_questions,
            "context": context_str,
        },
    )

    from typing import cast
    return cast("QuizGeneratedData", result)
