export type UserType = 'MEMBER' | 'ADMIN';

export interface JwtPayload {
  sub: string; // Member ID or Admin ID
  codeOrUsername: string; // memberCode (A000001) or admin username
  email: string;
  userType: UserType;
  roleName?: string; // Role name for Admin, or 'Member'
  iat?: number;
  exp?: number;
}
