"""Base schema + shared building blocks.

The frontend was built against camelCase JSON, so every schema serialises with
camelCase aliases while Python code keeps snake_case attributes.
"""

from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class MemberRef(CamelModel):
    member_code: str
    full_name: str


class Page(CamelModel, Generic[T]):
    data: list[T]
    total: int
    page: int
    page_size: int


class PaginationQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100, alias="pageSize")
    model_config = ConfigDict(populate_by_name=True)


# Re-exported for convenience in other schema modules.
__all__ = ["CamelModel", "MemberRef", "Page", "PaginationQuery", "datetime", "Decimal", "UUID"]
