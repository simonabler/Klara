import { AuthUserDto } from './auth-user.dto';

describe('AuthUserDto', () => {
  it('should have required fields id, email, displayName', () => {
    const dto: AuthUserDto = {
      id: 'uuid-1',
      email: 'lehrer@schule.at',
      displayName: 'Max Mustermann',
    };

    expect(dto.id).toBe('uuid-1');
    expect(dto.email).toBe('lehrer@schule.at');
    expect(dto.displayName).toBe('Max Mustermann');
  });

  it('should allow optional avatarUrl', () => {
    const withAvatar: AuthUserDto = {
      id: 'uuid-1',
      email: 'lehrer@schule.at',
      displayName: 'Max Mustermann',
      avatarUrl: 'https://example.com/avatar.jpg',
    };
    expect(withAvatar.avatarUrl).toBeDefined();

    const withoutAvatar: AuthUserDto = {
      id: 'uuid-1',
      email: 'lehrer@schule.at',
      displayName: 'Max Mustermann',
    };
    expect(withoutAvatar.avatarUrl).toBeUndefined();
  });
});
