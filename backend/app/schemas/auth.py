from pydantic import Field

from app.schemas.common import CamelModel


class MemberLoginRequest(CamelModel):
    """Member Code (A000001), e-mail, or phone + password."""

    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class AdminLoginRequest(CamelModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(CamelModel):
    refresh_token: str = Field(min_length=1)


class ChangePasswordRequest(CamelModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(CamelModel):
    access_token: str
    refresh_token: str
    expires_in: int


class LoginResponse(TokenResponse):
    user: dict
