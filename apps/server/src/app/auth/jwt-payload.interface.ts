export interface JwtPayload {
  sub: string;   // teacherId
  email: string;
  iat?: number;
  exp?: number;
}
