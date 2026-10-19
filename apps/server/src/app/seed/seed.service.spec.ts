import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';
import { DEMO_TEACHER } from '../common/demo-teacher';

/** Repository-Mock: create gibt das Objekt zurück, save vergibt IDs */
function makeRepo() {
  let n = 0;
  const withId = (o: any) => ({ id: `id-${++n}`, ...o });
  return {
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((o: any) => o),
    save: jest.fn((o: any) => Promise.resolve(Array.isArray(o) ? o.map(withId) : withId(o))),
  };
}

function setup(nodeEnv = 'development') {
  const repos = {
    teacher: makeRepo(),
    student: makeRepo(),
    parent: makeRepo(),
    class: makeRepo(),
    subject: makeRepo(),
    note: makeRepo(),
    assessment: makeRepo(),
    result: makeRepo(),
  };
  const config = { get: jest.fn((key: string) => (key === 'NODE_ENV' ? nodeEnv : undefined)) };
  const service = new SeedService(
    config as unknown as ConfigService,
    repos.teacher as any,
    repos.student as any,
    repos.parent as any,
    repos.class as any,
    repos.subject as any,
    repos.note as any,
    repos.assessment as any,
    repos.result as any,
  );
  return { service, repos };
}

describe('SeedService', () => {
  it('macht in Produktion nichts', async () => {
    const { service, repos } = setup('production');
    await service.onApplicationBootstrap();
    expect(repos.teacher.findOne).not.toHaveBeenCalled();
    expect(repos.student.save).not.toHaveBeenCalled();
  });

  it('legt die Demo-Lehrkraft mit derselben Identität wie der Demo-Login an', async () => {
    const { service, repos } = setup();
    await service.onApplicationBootstrap();

    expect(repos.teacher.findOne).toHaveBeenCalledWith({ where: { googleId: DEMO_TEACHER.googleId } });
    expect(repos.teacher.create).toHaveBeenCalledWith(
      expect.objectContaining({ googleId: DEMO_TEACHER.googleId, email: DEMO_TEACHER.email }),
    );
    expect(repos.student.save).toHaveBeenCalled();
  });

  it('befüllt eine bereits per Demo-Login angelegte Lehrkraft ohne Daten', async () => {
    const { service, repos } = setup();
    repos.teacher.findOne.mockResolvedValue({ id: 'existing', ...DEMO_TEACHER });
    repos.student.count.mockResolvedValue(0);

    await service.onApplicationBootstrap();

    expect(repos.teacher.save).not.toHaveBeenCalled();
    expect(repos.student.create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'existing' }));
  });

  it('überspringt den Seed, wenn die Demo-Lehrkraft schon Schüler hat', async () => {
    const { service, repos } = setup();
    repos.teacher.findOne.mockResolvedValue({ id: 'existing', ...DEMO_TEACHER });
    repos.student.count.mockResolvedValue(4);

    await service.onApplicationBootstrap();

    expect(repos.student.save).not.toHaveBeenCalled();
    expect(repos.teacher.save).not.toHaveBeenCalled();
  });
});
