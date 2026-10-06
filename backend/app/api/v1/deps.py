"""Small helpers shared by endpoint modules."""

from datetime import datetime

from fastapi import Query, Request


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


class DateRange:
    """?fromDate=&toDate= (ISO 8601) used by passbook and report endpoints."""

    def __init__(
        self,
        from_date: datetime | None = Query(default=None, alias="fromDate"),
        to_date: datetime | None = Query(default=None, alias="toDate"),
    ):
        self.from_date = from_date
        self.to_date = to_date
